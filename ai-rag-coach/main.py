import os
import uuid
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import psycopg2

from coach_service import ask_coach, ask_coach_stream, extract_citations, get_db_connection

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
def handle_chat_stream(req: ChatRequest):
    """
    Endpoint Streaming (SSE): Trả về từng từ thời gian thực (Typewriter Effect).
    AI nghĩ và nói đến đâu, frontend nhận và hiển thị ngay đến đó.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống")

    session_id = req.session_id
    conn = get_db_connection()
    cur = conn.cursor()
    
    if not session_id:
        session_id = str(uuid.uuid4())
        title = req.message[:50] + ("..." if len(req.message) > 50 else "")
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, match_id, title)
            VALUES (%s, %s, %s, %s);
        """, (session_id, req.user_id, req.match_id, title))
        conn.commit()

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
            for chunk in ask_coach_stream(message=req.message, match_id=req.match_id):
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
def handle_chat(req: ChatRequest):
    """Endpoint đồng bộ (Sync) thông thường."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu hỏi không được để trống")

    session_id = req.session_id
    conn = get_db_connection()
    cur = conn.cursor()
    
    if not session_id:
        session_id = str(uuid.uuid4())
        title = req.message[:50] + ("..." if len(req.message) > 50 else "")
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, match_id, title)
            VALUES (%s, %s, %s, %s);
        """, (session_id, req.user_id, req.match_id, title))
        conn.commit()

    cur.execute("""
        INSERT INTO chat_messages (session_id, sender_role, content)
        VALUES (%s, 'user', %s);
    """, (session_id, req.message))
    conn.commit()

    try:
        coach_result = ask_coach(message=req.message, match_id=req.match_id)
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
def get_chat_history(session_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
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
def list_chat_sessions(user_id: Optional[int] = None, match_id: Optional[int] = None):
    conn = get_db_connection()
    cur = conn.cursor()
    sql = "SELECT id, user_id, match_id, title, created_at FROM chat_sessions"
    params = []
    conditions = []
    if user_id:
        conditions.append("user_id = %s")
        params.append(user_id)
    if match_id:
        conditions.append("match_id = %s")
        params.append(match_id)
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
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

if __name__ == "__main__":
    import uvicorn
    print("Khởi động BadmintonAI Coach Service trên port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
