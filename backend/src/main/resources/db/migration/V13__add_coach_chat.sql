-- AI Coach chatbot: knowledge base for retrieval (pgvector) and chat history.
-- These tables first came from ai-rag-coach/schema.sql, so every statement is idempotent: it creates them on a
-- fresh database and leaves an existing one as it is.

CREATE EXTENSION IF NOT EXISTS vector;

-- Chunks of the badminton documents (BWF laws, tactics, techniques, fitness), embedded by gemini-embedding-001
-- with 768 dimensions. Filled by ai-rag-coach/ingest.py.
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,             -- rules, tactics, techniques, fitness_injury
    source_file VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_hnsw_idx
    ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

-- A conversation belongs to a signed-in user (user_id) or to one guest browser (browser_key).
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
    title VARCHAR(255) DEFAULT 'Cuộc trò chuyện mới',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS browser_key VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_browser_key ON chat_sessions (browser_key);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,          -- user, assistant
    content TEXT NOT NULL,
    video_citations JSONB DEFAULT '[]'::jsonb, -- [{rally_number, timestamp, seconds}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at);

-- Chunks whose cosine similarity to the query is above the threshold, most similar first.
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
    SELECT k.id, k.category, k.content, k.source_file, 1 - (k.embedding <=> query_embedding) AS similarity
    FROM knowledge_embeddings k
    WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
