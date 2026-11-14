import os
import re
import json
import psycopg2
from typing import Optional, List, Dict, Any, Generator
from google import genai
from google.genai import types

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

def get_match_statistics(match_id: int) -> Dict[str, Any]:
    """
    Lấy dữ liệu thống kê tổng thể của một trận đấu cầu lông theo match_id: Tên người chơi, tỷ số, tổng số cú đánh, tỉ lệ thuận/trái tay, thời lượng trung bình một pha cầu.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, title, player_a_name, player_b_name, status, start_score_a, start_score_b
            FROM matches WHERE id = %s;
        """, (match_id,))
        m_row = cur.fetchone()
        if not m_row:
            cur.close()
            conn.close()
            return {"error": f"Không tìm thấy trận đấu với ID {match_id}"}
            
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
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
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

# ==========================================
# 🤖 BADMINTON AI AGENT ENGINE
# ==========================================

SYSTEM_PROMPT = """
Bạn là BadmintonAI Coach - Huấn luyện viên ảo và Chuyên gia trinh sát chiến thuật cầu lông chuyên nghiệp trên nền tảng Badminton Platform.

NHIỆM VỤ CỦA BẠN:
1. Giải đáp các thắc mắc về Luật thi đấu chính thức BWF, kỹ thuật động tác (cầm vợt, phát lực cổ tay, smash, drop, phông cầu, di chuyển bộ chân 4 góc) và cẩm nang phòng tránh chấn thương khớp gối/vai bằng công cụ `search_badminton_knowledge`.
2. Phân tích chi tiết số liệu trận đấu, tỷ lệ thuận/trái tay, tốc độ và các pha mất điểm khi người dùng hỏi về một trận đấu cụ thể bằng công cụ `get_match_statistics` và `get_match_rallies_and_point_losses`.
3. Khi đề cập đến một pha cầu cụ thể trong trận đấu, bạn BẮT BUỘC phải viết mốc thời gian theo định dạng: `[Pha cầu #X - mm:ss]` (ví dụ: `[Pha cầu #3 - 01:25]`) để người dùng có thể click tua thẳng video đến đó.
4. Giữ phong thái chuyên nghiệp, khách quan của một huấn luyện viên đẳng cấp quốc tế, ngôn từ tiếng Việt chuẩn xác, súc tích và khích lệ người chơi.
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

def ask_coach_stream(message: str, match_id: Optional[int] = None) -> Generator[str, None, None]:
    """Hàm xử lý câu hỏi và stream từng từ (chunks) ra thời gian thực."""
    context_message = message
    if match_id:
        context_message = f"[Ngữ cảnh: Người dùng đang xem trận đấu match_id={match_id}]\nCâu hỏi: {message}"
        
    chat = client.chats.create(
        model='gemini-3.5-flash-lite',
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=[
                search_badminton_knowledge,
                get_match_statistics,
                get_match_rallies_and_point_losses,
                get_scouting_report
            ],
            temperature=0.3
        )
    )
    
    stream_response = chat.send_message_stream(context_message)
    for chunk in stream_response:
        if chunk.text:
            yield chunk.text

def ask_coach(message: str, match_id: Optional[int] = None) -> Dict[str, Any]:
    """Hàm xử lý câu hỏi dạng sync thông thường."""
    full_text = ""
    for chunk in ask_coach_stream(message, match_id):
        full_text += chunk
    return {
        "reply": full_text,
        "video_citations": extract_citations(full_text)
    }
