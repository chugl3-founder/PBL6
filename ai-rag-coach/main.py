import os
import uuid
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import psycopg2

from coach_service import ask_coach, ask_coach_stream, extract_citations, get_db_connection
from jwt_auth import decode_and_verify_token

app = FastAPI(
    title="BadmintonAI Coach & Tactician Service",
    description="Microservice AI RAG & Phân tích chiến thuật cầu lông (PBL6)",
    version="1.1.0"
)

# Cấu hình CORS để Frontend React gọi trực tiếp không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    match_id: Optional[int] = None
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    browser_key: Optional[str] = None  # UUID sinh từ localStorage, dùng để phân tách lịch sử chat riêng từng thiết bị/trình duyệt

class VideoCitation(BaseModel):
    rally_number: int
    timestamp: str
    seconds: int

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    video_citations: List[VideoCitation]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "BadmintonAI Coach Microservice", "version": "1.1.0"}

@app.post("/api/chat/stream")
def handle_chat_stream(
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Endpoint Streaming (SSE): Trả về từng từ thời gian thực (Typewriter Effect).
    Được bảo vệ bằng xác thực kép:
    - Nếu có JWT Bearer Token: Xác thực user_id và role từ Spring Boot.
    - Nếu là khách (Guest): Xác thực bằng browser_key riêng biệt trên thiết bị.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống")

    # Xác thực người dùng qua JWT
    auth_claims = decode_and_verify_token(authorization)
    auth_user_id = auth_claims.get("userId") if auth_claims else req.user_id
    auth_role = auth_claims.get("role") if auth_claims else None

    session_id = req.session_id
    conn = get_db_connection()
    cur = conn.cursor()
    
    if not session_id:
        session_id = str(uuid.uuid4())
        title = req.message[:50] + ("..." if len(req.message) > 50 else "")
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, match_id, title, browser_key)
            VALUES (%s, %s, %s, %s, %s);
        """, (session_id, auth_user_id, req.match_id, title, req.browser_key))
        conn.commit()
    else:
        # Xác thực quyền sở hữu session:
        cur.execute("SELECT user_id, browser_key FROM chat_sessions WHERE id = %s;", (session_id,))
        row = cur.fetchone()
        if row is None:
            cur.close(); conn.close()
            raise HTTPException(status_code=404, detail="Phiên trò chuyện không tồn tại")
        
        sess_user_id, sess_browser_key = row[0], row[1]
        is_owner = False
        # Bảo mật riêng tư: Chỉ người tạo phiên chat (auth_user_id) hoặc đúng trình duyệt khách (browser_key) mới được truy cập
        if auth_user_id and sess_user_id and str(auth_user_id) == str(sess_user_id):
            is_owner = True
        elif not sess_user_id and req.browser_key and sess_browser_key and req.browser_key == sess_browser_key:
            is_owner = True

        if not is_owner:
            cur.close(); conn.close()
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phiên trò chuyện riêng tư này")

    cur.execute("""
        INSERT INTO chat_messages (session_id, sender_role, content)
        VALUES (%s, 'user', %s);
    """, (session_id, req.message))
    conn.commit()
    cur.close()
    conn.close()

    def event_generator():
        accumulated_text = ""
        try:
            for chunk in ask_coach_stream(
                message=req.message, 
                match_id=req.match_id,
                user_id=auth_user_id,
                user_role=auth_role
            ):
                accumulated_text += chunk
                payload = json.dumps({"text": chunk, "done": False}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
        except Exception as e:
            err_msg = f"\n[Lỗi kết nối AI: {str(e)}]"
            accumulated_text += err_msg
            yield f"data: {json.dumps({'text': err_msg, 'done': False})}\n\n"

        citations = extract_citations(accumulated_text)

        # Lưu câu trả lời hoàn chỉnh vào database
        try:
            c = get_db_connection()
            cr = c.cursor()
            cr.execute("""
                INSERT INTO chat_messages (session_id, sender_role, content, video_citations)
                VALUES (%s, 'assistant', %s, %s);
            """, (session_id, accumulated_text, json.dumps(citations)))
            c.commit()
            cr.close()
            c.close()
        except Exception as ex:
            print("Lỗi lưu message vào DB:", ex)

        final_payload = json.dumps({
            "text": "",
            "done": True,
            "session_id": session_id,
            "video_citations": citations
        }, ensure_ascii=False)
        yield f"data: {final_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/chat", response_model=ChatResponse)
def handle_chat(
    req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """Endpoint đồng bộ (Sync) thông thường có xác thực bảo mật."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống")

    auth_claims = decode_and_verify_token(authorization)
    auth_user_id = auth_claims.get("userId") if auth_claims else req.user_id
    auth_role = auth_claims.get("role") if auth_claims else None

    session_id = req.session_id
    conn = get_db_connection()
    cur = conn.cursor()
    
    if not session_id:
        session_id = str(uuid.uuid4())
        title = req.message[:50] + ("..." if len(req.message) > 50 else "")
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, match_id, title, browser_key)
            VALUES (%s, %s, %s, %s, %s);
        """, (session_id, auth_user_id, req.match_id, title, req.browser_key))
        conn.commit()
    else:
        cur.execute("SELECT user_id, browser_key FROM chat_sessions WHERE id = %s;", (session_id,))
        row = cur.fetchone()
        if row is None:
            cur.close(); conn.close()
            raise HTTPException(status_code=404, detail="Session không tồn tại")
        
        sess_user_id, sess_browser_key = row[0], row[1]
        is_owner = False
        # Bảo mật riêng tư: Chỉ người tạo phiên chat (auth_user_id) hoặc đúng trình duyệt khách (browser_key) mới được truy cập
        if auth_user_id and sess_user_id and str(auth_user_id) == str(sess_user_id):
            is_owner = True
        elif not sess_user_id and req.browser_key and sess_browser_key and req.browser_key == sess_browser_key:
            is_owner = True

        if not is_owner:
            cur.close(); conn.close()
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phiên trò chuyện riêng tư này")

    cur.execute("""
        INSERT INTO chat_messages (session_id, sender_role, content)
        VALUES (%s, 'user', %s);
    """, (session_id, req.message))
    conn.commit()

    try:
        coach_result = ask_coach(
            message=req.message, 
            match_id=req.match_id,
            user_id=auth_user_id,
            user_role=auth_role
        )
        reply = coach_result.get("reply", "")
        citations = coach_result.get("video_citations", [])
    except Exception as e:
        reply = f"Xin lỗi, Huấn luyện viên AI gặp trục trặc: {str(e)}"
        citations = []

    cur.execute("""
        INSERT INTO chat_messages (session_id, sender_role, content, video_citations)
        VALUES (%s, 'assistant', %s, %s);
    """, (session_id, reply, json.dumps(citations)))
    conn.commit()
    cur.close()
    conn.close()

    return ChatResponse(
        session_id=session_id,
        reply=reply,
        video_citations=citations
    )

@app.get("/api/chat/history/{session_id}")
def get_chat_history(
    session_id: str, 
    browser_key: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Trả về lịch sử tin nhắn của một phiên chat.
    Bảo vệ bằng JWT hoặc browser_key:
    - Nếu đăng nhập: user_id phải khớp với session.
    - Nếu là khách: browser_key phải khớp với session.
    """
    auth_claims = decode_and_verify_token(authorization)
    auth_user_id = auth_claims.get("userId") if auth_claims else None
    auth_role = auth_claims.get("role") if auth_claims else None

    if not auth_user_id and not browser_key:
        raise HTTPException(status_code=401, detail="Thiếu thông tin xác thực (token hoặc browser_key).")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT user_id, browser_key FROM chat_sessions WHERE id = %s;", (session_id,))
    row = cur.fetchone()
    if row is None:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Phiên trò chuyện không tồn tại.")
        
    sess_user_id, sess_browser_key = row[0], row[1]
    is_owner = False
    # Bảo mật riêng tư: Chỉ người tạo phiên chat (auth_user_id) hoặc đúng trình duyệt khách (browser_key) mới được xem lịch sử
    if auth_user_id and sess_user_id and str(auth_user_id) == str(sess_user_id):
        is_owner = True
    elif not sess_user_id and browser_key and sess_browser_key and browser_key == sess_browser_key:
        is_owner = True

    if not is_owner:
        cur.close(); conn.close()
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem lịch sử trò chuyện riêng tư này.")

    cur.execute("""
        SELECT id, sender_role, content, video_citations, created_at
        FROM chat_messages
        WHERE session_id = %s
        ORDER BY created_at ASC;
    """, (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    messages = []
    for r in rows:
        messages.append({
            "id": r[0],
            "role": r[1],
            "content": r[2],
            "video_citations": r[3] if r[3] else [],
            "created_at": r[4].isoformat() if r[4] else None
        })
    return {"session_id": session_id, "messages": messages}

@app.get("/api/chat/sessions")
def list_chat_sessions(
    browser_key: Optional[str] = None,
    match_id: Optional[int] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Trả về danh sách các phiên trò chuyện của RIÊNG người dùng hiện tại:
    - Nếu đã đăng nhập: Lấy các session có user_id = auth_user_id.
    - Nếu là khách: Lấy các session có browser_key = browser_key.
    - Tuyệt đối không trả về bất kỳ session nào của người khác!
    """
    auth_claims = decode_and_verify_token(authorization)
    auth_user_id = auth_claims.get("userId") if auth_claims else None

    if not auth_user_id and not browser_key:
        return {"sessions": []}

    conn = get_db_connection()
    cur = conn.cursor()
    
    if auth_user_id:
        sql = "SELECT id, user_id, match_id, title, created_at FROM chat_sessions WHERE user_id = %s"
        params = [auth_user_id]
    else:
        sql = "SELECT id, user_id, match_id, title, created_at FROM chat_sessions WHERE browser_key = %s"
        params = [browser_key]

    if match_id:
        sql += " AND match_id = %s"
        params.append(match_id)
    sql += " ORDER BY created_at DESC LIMIT 20;"

    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    sessions = []
    for r in rows:
        sessions.append({
            "session_id": r[0],
            "user_id": r[1],
            "match_id": r[2],
            "title": r[3],
            "created_at": r[4].isoformat() if r[4] else None
        })
    return {"sessions": sessions}

@app.get("/api/matches/list")
def list_available_matches(authorization: Optional[str] = Header(None)):
    """
    DANH SÁCH TRẬN ĐẤU ĐƯỢC PHÉP SO SÁNH:
    - Mọi người (kể cả Guest): Xem được tất cả các trận PUBLISHED (công khai).
    - Người dùng đăng nhập: Xem được tất cả các trận PUBLISHED + các trận DO CHÍNH HỌ TẢI LÊN (owner_id = auth_user_id).
    - ROLE_ADMIN: Xem được toàn bộ các trận đã phân tích trong hệ thống.
    - TUYỆT ĐỐI KHÔNG lộ trận riêng tư của người dùng khác!
    """
    auth_claims = decode_and_verify_token(authorization)
    auth_user_id = auth_claims.get("userId") if auth_claims else None
    auth_role = auth_claims.get("role") if auth_claims else None

    conn = get_db_connection()
    cur = conn.cursor()

    if auth_role == "ROLE_ADMIN":
        # Admin thấy toàn bộ trận đã phân tích
        sql = """
            SELECT DISTINCT ON (m.id) 
                   m.id, m.title, m.player_a_name, m.player_b_name, 
                   m.start_score_a, m.start_score_b, COALESCE(s.total_strokes, 0)
            FROM matches m
            JOIN match_statistics s ON m.id = s.match_id
            WHERE m.deleted_at IS NULL
            ORDER BY m.id DESC
            LIMIT 50;
        """
        cur.execute(sql)
    elif auth_user_id:
        # User đăng nhập thấy trận PUBLISHED + trận của chính mình
        sql = """
            SELECT DISTINCT ON (m.id) 
                   m.id, m.title, m.player_a_name, m.player_b_name, 
                   m.start_score_a, m.start_score_b, COALESCE(s.total_strokes, 0)
            FROM matches m
            JOIN match_statistics s ON m.id = s.match_id
            WHERE m.deleted_at IS NULL AND (m.status = 'PUBLISHED' OR m.owner_id = %s)
            ORDER BY m.id DESC
            LIMIT 50;
        """
        cur.execute(sql, (auth_user_id,))
    else:
        # Khách vãng lai CHỈ xem được trận PUBLISHED
        sql = """
            SELECT DISTINCT ON (m.id) 
                   m.id, m.title, m.player_a_name, m.player_b_name, 
                   m.start_score_a, m.start_score_b, COALESCE(s.total_strokes, 0)
            FROM matches m
            JOIN match_statistics s ON m.id = s.match_id
            WHERE m.deleted_at IS NULL AND m.status = 'PUBLISHED'
            ORDER BY m.id DESC
            LIMIT 50;
        """
        cur.execute(sql)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    matches = []
    for r in rows:
        matches.append({
            "id": r[0],
            "title": r[1],
            "player_a": r[2],
            "player_b": r[3],
            "score": f"{r[4]}-{r[5]}",
            "total_strokes": r[6]
        })
    return {"matches": matches}

if __name__ == "__main__":
    import uvicorn
    print("Khởi động BadmintonAI Coach Service trên port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
