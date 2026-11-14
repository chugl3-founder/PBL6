import os
import re
import json
import threading
import psycopg2
from typing import Optional, List, Dict, Any, Generator
from google import genai
from google.genai import types

# Biến ngữ cảnh ThreadLocal lưu user_id và role của người gọi an toàn qua generator
_local_auth_context = threading.local()

def set_auth_context(user_id: Optional[int], role: Optional[str]):
    _local_auth_context.user_id = user_id
    _local_auth_context.role = role

def get_auth_context() -> tuple[Optional[int], Optional[str]]:
    return getattr(_local_auth_context, 'user_id', None), getattr(_local_auth_context, 'role', None)

def clear_auth_context():
    _local_auth_context.user_id = None
    _local_auth_context.role = None

def load_env(filepath):
    env_vars = {}
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip()
    return env_vars

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = load_env(os.path.join(root_dir, '.env'))

db_url = env.get('SPRING_DATASOURCE_URL', '')
if db_url.startswith('jdbc:'):
    db_url = db_url[5:]
db_user = env.get('SPRING_DATASOURCE_USERNAME', '')
db_pass = env.get('SPRING_DATASOURCE_PASSWORD', '')

def get_db_connection():
    return psycopg2.connect(db_url, user=db_user, password=db_pass)

client = genai.Client(api_key=env.get('GEMINI_API_KEY'))

# ==========================================
# 🛠️ CÁC CÔNG CỤ (TOOLS) DÀNH CHO AI AGENT
# ==========================================

def search_badminton_knowledge(query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Tìm kiếm tri thức chuyên môn cầu lông trong kho Vector: Luật BWF, kỹ thuật (smash, drop, footwork), chiến thuật đơn/đôi, bài tập cổ tay và phòng ngừa chấn thương.
    """
    try:
        resp = client.models.embed_content(
            model='gemini-embedding-001',
            contents=query,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        query_vec = "[" + ",".join(map(str, resp.embeddings[0].values)) + "]"
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        if category:
            sql = """
                SELECT category, source_file, content, similarity 
                FROM match_knowledge(%s::vector, 0.40, 4)
                WHERE category = %s;
            """
            cur.execute(sql, (query_vec, category))
        else:
            sql = "SELECT category, source_file, content, similarity FROM match_knowledge(%s::vector, 0.40, 4);"
            cur.execute(sql, (query_vec,))
            
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        return [
            {"category": r[0], "source": r[1], "content": r[2], "similarity": round(float(r[3]), 3)}
            for r in rows
        ]
    except Exception as e:
        return [{"error": f"Lỗi tìm kiếm tri thức: {str(e)}"}]

def check_match_access(cur, match_id: int) -> tuple[bool, Optional[str], Optional[tuple]]:
    """
    KIỂM TRA BẢO MẬT PHÂN QUYỀN TRẬN ĐẤU:
    1. Trận có status = 'PUBLISHED' và deleted_at IS NULL: Công khai, cho phép mọi người (kể cả Guest).
    2. Người dùng có role = 'ROLE_ADMIN': Cho phép truy cập.
    3. Người dùng đăng nhập có user_id trùng với owner_id: Cho phép chủ sở hữu trận đấu truy cập.
    4. Các trường hợp khác: TỪ CHỐI TRUY CẬP để bảo vệ video/trận đấu riêng tư của người dùng.
    """
    cur.execute("""
        SELECT id, title, player_a_name, player_b_name, status, start_score_a, start_score_b, owner_id
        FROM matches 
        WHERE id = %s AND deleted_at IS NULL;
    """, (match_id,))
    m_row = cur.fetchone()
    if not m_row:
        return False, f"Không tìm thấy trận đấu với ID {match_id} (hoặc trận đấu đã bị xóa).", None

    status = m_row[4]
    owner_id = m_row[7]

    user_id, user_role = get_auth_context()

    # Trận công khai
    if status == 'PUBLISHED':
        return True, None, m_row

    # Quản trị viên
    if user_role == 'ROLE_ADMIN':
        return True, None, m_row

    # Chủ sở hữu
    if user_id is not None and owner_id == user_id:
        return True, None, m_row

    # Bị từ chối
    return False, f"QUYỀN RIÊNG TƯ: Trận đấu #{match_id} là trận đấu riêng tư của người dùng khác. Bạn không có quyền xem hoặc phân tích số liệu trận này.", None

def get_match_statistics(match_id: int) -> Dict[str, Any]:
    """
    Lấy dữ liệu thống kê tổng thể của một trận đấu cầu lông theo match_id: Tên người chơi, tỷ số, tổng số cú đánh, tỉ lệ thuận/trái tay, thời lượng trung bình một pha cầu.
    Được bảo vệ bằng phân quyền: Chỉ cho phép xem nếu trận đấu là PUBLISHED hoặc thuộc sở hữu của người dùng.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        allowed, err_msg, m_row = check_match_access(cur, match_id)
        if not allowed or not m_row:
            cur.close()
            conn.close()
            return {"error": err_msg}
            
        cur.execute("""
            SELECT total_strokes, total_rallies, avg_strokes_per_rally, avg_rally_duration,
                   player_a_strokes, player_b_strokes, forehand_count, backhand_count, avg_confidence
            FROM match_statistics WHERE match_id = %s;
        """, (match_id,))
        s_row = cur.fetchone()
        
        cur.close()
        conn.close()
        
        res = {
            "match_id": m_row[0],
            "title": m_row[1],
            "player_a": m_row[2],
            "player_b": m_row[3],
            "status": m_row[4],
            "score": f"{m_row[5]}-{m_row[6]}"
        }
        if s_row:
            res.update({
                "total_strokes": s_row[0],
                "total_rallies": s_row[1],
                "avg_strokes_per_rally": float(s_row[2]) if s_row[2] else 0.0,
                "avg_rally_duration_seconds": float(s_row[3]) if s_row[3] else 0.0,
                "player_a_strokes": s_row[4],
                "player_b_strokes": s_row[5],
                "forehand_count": s_row[6],
                "backhand_count": s_row[7],
                "ai_avg_confidence": float(s_row[8]) if s_row[8] else 0.0
            })
        return res
    except Exception as e:
        return {"error": f"Lỗi lấy thống kê trận đấu: {str(e)}"}

def get_match_rallies_and_point_losses(match_id: int, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Lấy danh sách các pha cầu (rallies) tiêu biểu của trận đấu: số thứ tự pha cầu, thời gian bắt đầu (giây), thời gian kết thúc, bên thắng, lý do thắng/thua, diễn biến tỷ số.
    Được bảo vệ bằng phân quyền: Chỉ cho phép xem nếu trận đấu là PUBLISHED hoặc thuộc sở hữu của người dùng.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        allowed, err_msg, _ = check_match_access(cur, match_id)
        if not allowed:
            cur.close()
            conn.close()
            return [{"error": err_msg}]

        cur.execute("""
            SELECT rally_number, start_time, end_time, duration, total_strokes,
                   winner_side, win_reason, score_text
            FROM rallies
            WHERE match_id = %s
            ORDER BY rally_number ASC
            LIMIT %s;
        """, (match_id, limit))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        results = []
        for r in rows:
            results.append({
                "rally_number": r[0],
                "start_time_seconds": round(float(r[1]), 1) if r[1] is not None else 0.0,
                "end_time_seconds": round(float(r[2]), 1) if r[2] is not None else 0.0,
                "duration_seconds": round(float(r[3]), 1) if r[3] is not None else 0.0,
                "strokes_count": r[4],
                "winner_side": r[5],
                "win_reason": r[6],
                "score_text": r[7]
            })
        return results
    except Exception as e:
        return [{"error": f"Lỗi lấy danh sách pha cầu: {str(e)}"}]
        return [{"error": f"Lỗi lấy danh sách pha cầu: {str(e)}"}]

def get_scouting_report(opponent_name: str) -> Dict[str, Any]:
    """
    Lấy báo cáo trinh sát chiến thuật đối đầu của một vận động viên: điểm mạnh, điểm yếu, kế hoạch chiến thuật (game plan), ghi chú huấn luyện viên.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT title, opponent_name, own_player_name, coach_notes, plan_data
            FROM scouting_reports
            WHERE opponent_name ILIKE %s
            ORDER BY created_at DESC
            LIMIT 1;
        """, (f"%{opponent_name}%",))
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return {"message": f"Chưa có báo cáo trinh sát chi tiết cho đối thủ '{opponent_name}' trong hệ thống."}
            
        return {
            "title": row[0],
            "opponent": row[1],
            "own_player": row[2],
            "coach_notes": row[3],
            "plan_data": row[4]
        }
    except Exception as e:
        return {"error": f"Lỗi lấy báo cáo trinh sát: {str(e)}"}

def compare_match_performances(match_id_1: int, match_id_2: int) -> Dict[str, Any]:
    """
    So sánh toàn diện phong độ, nhịp độ và các chỉ số kỹ thuật/chiến thuật giữa 2 trận đấu cầu lông.
    - match_id_1: ID trận đấu thứ nhất
    - match_id_2: ID trận đấu thứ hai
    Được bảo vệ bằng phân quyền: Chỉ so sánh được nếu trận đấu là PUBLISHED (công khai), hoặc là trận do chính người dùng sở hữu / quyền Admin.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        def fetch_single_match(mid: int):
            # BẢO MẬT: Kiểm tra quyền xem trận qua check_match_access
            allowed, err_msg, m_row = check_match_access(cur, mid)
            if not allowed or not m_row:
                return None, err_msg
                
            cur.execute("""
                SELECT total_strokes, total_rallies, avg_strokes_per_rally, avg_rally_duration,
                       player_a_strokes, player_b_strokes, forehand_count, backhand_count, avg_confidence
                FROM match_statistics WHERE match_id = %s;
            """, (mid,))
            s_row = cur.fetchone()
            
            cur.execute("""
                SELECT win_reason, count(*) 
                FROM rallies 
                WHERE match_id = %s AND win_reason IS NOT NULL 
                GROUP BY win_reason;
            """, (mid,))
            win_reasons = dict(cur.fetchall())
            
            cur.execute("""
                SELECT count(*), COALESCE(MAX(duration), 0), COALESCE(MAX(total_strokes), 0)
                FROM rallies WHERE match_id = %s AND total_strokes >= 15;
            """, (mid,))
            long_rally_row = cur.fetchone()
            long_rallies = long_rally_row[0] if long_rally_row else 0
            max_duration = float(long_rally_row[1]) if long_rally_row else 0.0
            max_strokes = long_rally_row[2] if long_rally_row else 0
            
            total_strokes = s_row[0] if s_row and s_row[0] else 0
            fh = s_row[6] if s_row and s_row[6] else 0
            bh = s_row[7] if s_row and s_row[7] else 0
            fh_pct = round((fh / total_strokes * 100), 1) if total_strokes > 0 else 0.0
            bh_pct = round((bh / total_strokes * 100), 1) if total_strokes > 0 else 0.0
            
            return {
                "match_id": m_row[0],
                "title": m_row[1],
                "player_a": m_row[2],
                "player_b": m_row[3],
                "status": m_row[4],
                "score": f"{m_row[5]}-{m_row[6]}",
                "total_strokes": total_strokes,
                "total_rallies": s_row[1] if s_row else 0,
                "avg_strokes_per_rally": float(s_row[2]) if s_row and s_row[2] else 0.0,
                "avg_rally_duration_seconds": float(s_row[3]) if s_row and s_row[3] else 0.0,
                "player_a_strokes": s_row[4] if s_row else 0,
                "player_b_strokes": s_row[5] if s_row else 0,
                "forehand_count": fh,
                "backhand_count": bh,
                "forehand_percentage": fh_pct,
                "backhand_percentage": bh_pct,
                "long_rallies_count": long_rallies,
                "max_rally_duration_seconds": round(max_duration, 1),
                "max_strokes_in_single_rally": max_strokes,
                "win_reasons_breakdown": win_reasons
            }, None

        m1_data, err1 = fetch_single_match(match_id_1)
        m2_data, err2 = fetch_single_match(match_id_2)
        
        cur.close()
        conn.close()
        
        if not m1_data:
            return {"error": err1 or f"Không tìm thấy dữ liệu cho trận đấu #{match_id_1}"}
        if not m2_data:
            return {"error": err2 or f"Không tìm thấy dữ liệu cho trận đấu #{match_id_2}"}
            
        return {
            "match_1": m1_data,
            "match_2": m2_data,
            "comparison_summary": {
                "strokes_diff": m2_data["total_strokes"] - m1_data["total_strokes"],
                "rally_duration_diff_sec": round(m2_data["avg_rally_duration_seconds"] - m1_data["avg_rally_duration_seconds"], 2),
                "avg_strokes_diff": round(m2_data["avg_strokes_per_rally"] - m1_data["avg_strokes_per_rally"], 2),
                "forehand_ratio_diff_pct": round(m2_data["forehand_percentage"] - m1_data["forehand_percentage"], 1),
                "long_rallies_diff": m2_data["long_rallies_count"] - m1_data["long_rallies_count"]
            }
        }
    except Exception as e:
        return {"error": f"Lỗi so sánh phong độ 2 trận: {str(e)}"}

def recommend_matches(play_style: Optional[str] = "", preferred_shots: Optional[str] = "", pace: Optional[str] = "", limit: int = 3) -> List[Dict[str, Any]]:
    """
    Gợi ý các trận đấu cầu lông tiêu biểu phù hợp nhất với phong cách thi đấu, kỹ thuật mong muốn và nhịp độ ưa thích của người dùng:
    - play_style: Phong cách chơi (ví dụ: 'tấn công áp đảo, smash', 'phòng thủ phản công, kiểm soát', 'tốc độ cao, bắt lưới', 'tinh quái, điều cầu')
    - preferred_shots: Kỹ thuật muốn học/chiêm ngưỡng (ví dụ: 'jump smash cắm sàn', 'drop siết lưới', 'net kill', 'bộ chân di chuyển')
    - pace: Nhịp độ trận đấu (ví dụ: 'marathon giằng co nghẹt thở', 'nhanh gọn kết thúc dứt khoát', 'chung kết giải lớn')
    Trả về danh sách trận đấu phù hợp, số liệu thống kê tiêu biểu và lý do tại sao trận đấu này phù hợp.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        user_id, user_role = get_auth_context()
        if user_role == "ROLE_ADMIN":
            sql = """
                SELECT m.id, m.title, m.player_a_name, m.player_b_name, m.description,
                       s.total_strokes, s.total_rallies, s.avg_strokes_per_rally, s.avg_rally_duration,
                       s.forehand_count, s.backhand_count
                FROM matches m
                LEFT JOIN match_statistics s ON m.id = s.match_id
                WHERE m.deleted_at IS NULL;
            """
            cur.execute(sql)
        elif user_id:
            sql = """
                SELECT m.id, m.title, m.player_a_name, m.player_b_name, m.description,
                       s.total_strokes, s.total_rallies, s.avg_strokes_per_rally, s.avg_rally_duration,
                       s.forehand_count, s.backhand_count
                FROM matches m
                LEFT JOIN match_statistics s ON m.id = s.match_id
                WHERE m.deleted_at IS NULL AND (m.status = 'PUBLISHED' OR m.owner_id = %s);
            """
            cur.execute(sql, (user_id,))
        else:
            sql = """
                SELECT m.id, m.title, m.player_a_name, m.player_b_name, m.description,
                       s.total_strokes, s.total_rallies, s.avg_strokes_per_rally, s.avg_rally_duration,
                       s.forehand_count, s.backhand_count
                FROM matches m
                LEFT JOIN match_statistics s ON m.id = s.match_id
                WHERE m.deleted_at IS NULL AND m.status = 'PUBLISHED';
            """
            cur.execute(sql)
            
        rows = cur.fetchall()
        scored_matches = []
        
        style_lower = (play_style or "").lower()
        shots_lower = (preferred_shots or "").lower()
        pace_lower = (pace or "").lower()
        
        for r in rows:
            mid, title, pA, pB, desc, strokes, rallies, avg_strokes, avg_dur, fh, bh = r
            score = 0
            reasons = []
            text_corpus = f"{title or ''} {pA or ''} {pB or ''} {desc or ''}".lower()
            
            # Tấn công / Smash
            if any(k in style_lower or k in shots_lower for k in ['tấn công', 'smash', 'áp đảo', 'uy lực', 'power']):
                if any(p in text_corpus for p in ['axelsen', 'lee zii jia', 'shi yuqi', 'ginting']):
                    score += 6
                    reasons.append("Sở hữu những tay đập cầu sấm sét hàng đầu thế giới (Viktor Axelsen / Lee Zii Jia / Shi Yuqi).")
                if fh and strokes and (fh / strokes) > 0.55:
                    score += 3
                    reasons.append(f"Tỷ lệ cú thuận tay tấn công áp đảo chiếm {round(fh/strokes*100, 1)}% tổng cú đánh.")
                    
            # Phòng thủ / Kiểm soát / Bền bỉ
            if any(k in style_lower or k in shots_lower for k in ['phòng thủ', 'kiểm soát', 'bền bỉ', 'bộ chân', 'thủ cầu']):
                if any(p in text_corpus for p in ['momota', 'chou tien chen', 'kunlavut']):
                    score += 6
                    reasons.append("Lối chơi bậc thầy về điều cầu chiến thuật và phòng thủ phản công của Kento Momota / Chou Tien Chen.")
                if avg_strokes and float(avg_strokes) >= 15:
                    score += 4
                    reasons.append(f"Thời lượng pha cầu cực kỳ bền bỉ (trung bình {round(float(avg_strokes), 1)} cú đánh/pha).")
                    
            # Tốc độ / Lưới / Gài lưới
            if any(k in style_lower or k in shots_lower for k in ['tốc độ', 'lưới', 'nhanh', 'gài lưới', 'net kill', 'drop']):
                if any(p in text_corpus for p in ['ginting', 'lee zii jia']):
                    score += 5
                    reasons.append("Tốc độ bắt lưới chớp nhoáng và kỹ thuật siết lưới thần tốc của Anthony Ginting.")
                    
            # Nhịp độ Marathon / Giằng co
            if any(k in pace_lower for k in ['marathon', 'giằng co', 'dài', 'nghẹt thở']):
                if strokes and strokes >= 700:
                    score += 4
                    reasons.append(f"Trận đấu có khối lượng vận động khổng lồ ({strokes} cú đánh kịch tính).")
                    
            # Chung kết giải lớn
            if any(k in pace_lower for k in ['chung kết', 'giải lớn', 'finals', 'all england', 'world tour']):
                if any(kw in text_corpus for kw in ['finals', 'chung kết', 'all england', 'world tour']):
                    score += 4
                    reasons.append("Không khí kịch tính của trận đấu đỉnh cao tại đấu trường Super Series / Finals.")

            scored_matches.append({
                "match_id": mid,
                "title": title,
                "players": f"{pA} vs {pB}",
                "total_strokes": strokes or 0,
                "avg_strokes_per_rally": float(avg_strokes) if avg_strokes else 0.0,
                "match_reasons": reasons or ["Trận đấu kinh điển hội tụ đầy đủ kỹ năng đỉnh cao đáng học hỏi."],
                "relevance_score": score
            })
            
        scored_matches.sort(key=lambda x: x["relevance_score"], reverse=True)
        cur.close()
        conn.close()
        return scored_matches[:limit]
    except Exception as e:
        return [{"error": f"Lỗi gợi ý trận đấu: {str(e)}"}]

# ==========================================
# 🤖 BADMINTON AI AGENT ENGINE
# ==========================================

SYSTEM_PROMPT = """
Bạn là BadmintonAI Coach - Huấn luyện viên ảo và Chuyên gia trinh sát chiến thuật cầu lông chuyên nghiệp trên nền tảng Badminton Platform.

NHIỆM VỤ CỦA BẠN:
1. Giải đáp các thắc mắc về Luật thi đấu chính thức BWF, kỹ thuật động tác (cầm vợt, phát lực cổ tay, smash, drop, phông cầu, di chuyển bộ chân 4 góc) và cẩm nang phòng tránh chấn thương khớp gối/vai bằng công cụ `search_badminton_knowledge`.
2. Phân tích chi tiết số liệu trận đấu, tỷ lệ thuận/trái tay, tốc độ và các pha mất điểm khi người dùng hỏi về một trận đấu cụ thể bằng công cụ `get_match_statistics` và `get_match_rallies_and_point_losses`.
3. Khi đề cập đến một pha cầu cụ thể trong trận đấu, bạn BẮT BUỘC phải viết mốc thời gian theo định dạng: `[Pha cầu #X - mm:ss]` (ví dụ: `[Pha cầu #3 - 01:25]`) để người dùng có thể click tua thẳng video đến đó.
4. SO SÁNH PHONG ĐỘ 2 TRẬN ĐẤU (`compare_match_performances`): Khi người dùng yêu cầu so sánh 2 trận đấu:
   - Bạn BẮT BUỘC lập BẢNG SO SÁNH TRỰC QUAN (Markdown Table) đặt song song 2 trận:
     | Chỉ số phân tích | Trận #{m1_id} ({m1_title}) | Trận #{m2_id} ({m2_title}) | Chênh lệch / Đánh giá |
   - Phân tích sâu 3 khía cạnh cốt lõi:
     a. Thể lực & Nhịp độ (Pace & Endurance): Khả năng duy trì các pha cầu bền (long rallies), thời lượng trung bình pha cầu.
     b. Kỹ thuật & Quyền chủ động (Control & Aggression): Tỷ lệ đánh thuận tay ép đối thủ so với phòng thủ trái tay.
     c. Hiệu quả ghi điểm & Kiểm soát lỗi (Finishing & Error Management): Khả năng dứt điểm bằng smash/drop và các pha ép đối thủ tự hỏng.
   - Kết luận phong độ: Đưa ra nhận xét đúc kết tay vợt tiến bộ hay sa sút ở mặt nào, cùng lời khuyên huấn luyện viên cụ thể cho các trận sau.
5. GỢI Ý TRẬN ĐẤU (`recommend_matches`):
   - Khi người dùng muốn tìm kiếm hoặc nhờ bạn gợi ý trận đấu:
     + Nếu người dùng đã cung cấp sở thích (hoặc vừa hoàn thành khảo sát sở thích): Hãy gọi ngay công cụ `recommend_matches` để chọn ra các trận đấu tối ưu nhất.
     + Trình bày mỗi trận đấu được gợi ý thật hấp dẫn:
       * Tên trận đấu & 2 tay vợt tranh tài.
       * Phân tích lý do vì sao trận này phù hợp với sở thích/mục tiêu của người dùng.
       * Cú pháp thẻ xem trận đấu BẮT BUỘC: `[Xem trận đấu #X]` (ví dụ: `[Xem trận đấu #4]`).
       * Mốc pha cầu tiêu biểu nếu có: `[Pha cầu #X - mm:ss]` để người dùng click tua video xem ngay.
     + Nếu người dùng chỉ nói chung chung "gợi ý trận đấu cho tôi" mà chưa có sở thích: Hãy nhiệt tình chào đón, gợi ý ngắn gọn và nhắc người dùng có thể tick chọn nhanh vào Bảng khảo sát sở thích (Questionnaire) để nhận gợi ý chuẩn xác nhất.
6. Giữ phong thái chuyên nghiệp, khách quan của một huấn luyện viên đẳng cấp quốc tế, ngôn từ tiếng Việt chuẩn xác, súc tích và khích lệ người chơi.
"""

def extract_citations(text: str) -> List[Dict[str, Any]]:
    """Trích xuất các mốc video clickable [Pha cầu #X - mm:ss]."""
    citations = []
    pattern = r'\[Pha cầu #(\d+)\s*-\s*(\d+):(\d+)\]'
    for match in re.finditer(pattern, text):
        rally_num = int(match.group(1))
        minutes = int(match.group(2))
        seconds = int(match.group(3))
        total_sec = minutes * 60 + seconds
        citations.append({
            "rally_number": rally_num,
            "timestamp": f"{minutes:02d}:{seconds:02d}",
            "seconds": total_sec
        })
    return citations

def ask_coach_stream(
    message: str, 
    match_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_role: Optional[str] = None
) -> Generator[str, None, None]:
    """Hàm xử lý câu hỏi và stream từng từ (chunks) ra thời gian thực, có thiết lập ngữ cảnh quyền người dùng an toàn."""
    set_auth_context(user_id, user_role)
    try:
        context_message = message
        if match_id:
            context_message = f"[Ngữ cảnh: Người dùng đang xem trận đấu match_id={match_id}]\nCâu hỏi: {message}"
            
        tools = [
            search_badminton_knowledge,
            get_match_statistics,
            get_match_rallies_and_point_losses,
            get_scouting_report,
            compare_match_performances,
            recommend_matches
        ]

        models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']
        last_err = None

        for m in models:
            try:
                chat = client.chats.create(
                    model=m,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=tools,
                        temperature=0.3
                    )
                )
                resp = chat.send_message(context_message)
                full_text = resp.text or ""
                if full_text:
                    words = full_text.split(" ")
                    for i, w in enumerate(words):
                        yield w + (" " if i < len(words) - 1 else "")
                    return
            except Exception as e:
                last_err = e
                continue

        if last_err:
            yield f"⚠️ Lỗi kết nối AI: {str(last_err)}"
    finally:
        clear_auth_context()

def ask_coach(
    message: str, 
    match_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_role: Optional[str] = None
) -> Dict[str, Any]:
    """Hàm xử lý câu hỏi dạng sync thông thường, có thiết lập ngữ cảnh quyền người dùng."""
    full_text = ""
    for chunk in ask_coach_stream(message, match_id, user_id, user_role):
        full_text += chunk
    return {
        "reply": full_text,
        "video_citations": extract_citations(full_text)
    }
