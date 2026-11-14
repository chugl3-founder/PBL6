-- ========================================================
-- SUPABASE / POSTGRESQL SCHEMA CHO AI RAG CHATBOT (PBL6)
-- ========================================================

-- 1. Kích hoạt Extension pgvector (nếu chưa bật)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Bảng lưu trữ Tri thức chuyên môn cầu lông (Vector Embeddings)
-- Sử dụng vector 768 chiều (tối ưu cho Google Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,            -- 'rules', 'tactics', 'techniques', 'fitness_injury'
    source_file VARCHAR(255) NOT NULL,        -- Tên file tài liệu gốc (ví dụ: bwf_laws_2024.pdf)
    content TEXT NOT NULL,                    -- Đoạn văn bản (chunk) được cắt ra
    embedding vector(768) NOT NULL,           -- Vector embedding 768 chiều
    metadata JSONB DEFAULT '{}'::jsonb,       -- Thông tin phụ: trang sách, chương, tiêu đề
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo Index HNSW để tìm kiếm tương đồng vector siêu nhanh (< 5ms)
CREATE INDEX IF NOT EXISTS knowledge_embeddings_hnsw_idx 
ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

-- 3. Bảng quản lý Phiên trò chuyện (Chat Sessions)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
    title VARCHAR(255) DEFAULT 'Cuộc trò chuyện mới',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng lưu Lịch sử tin nhắn (Chat Messages)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,         -- 'user' hoặc 'assistant'
    content TEXT NOT NULL,                     -- Nội dung tin nhắn
    video_citations JSONB DEFAULT '[]'::jsonb, -- Mốc video đính kèm: [{"rally": 5, "time": 182}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Function tiện ích: Tìm kiếm tương đồng vector (RPC function cho Supabase)
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  category varchar,
  content text,
  source_file varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.category,
    k.content,
    k.source_file,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings k
  WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
