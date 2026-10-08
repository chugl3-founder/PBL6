-- ==============================================================================
-- Flyway Database Migration: V1__init_schema.sql
-- Project: PBL6 Badminton - Match Analysis & Replay Platform
-- DBMS: PostgreSQL 15+
-- Author: Engineering Team
-- Date: 2026-10-08
-- Description: Khởi tạo toàn bộ cấu trúc bảng, ràng buộc, khóa ngoại và chỉ mục.
-- ==============================================================================

-- 1. BẢNG USERS (Người dùng & Quản trị viên)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    avatar_url VARCHAR(500),
    full_name VARCHAR(100),
    age INT,
    gender VARCHAR(20),
    badminton_level VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'LOCKED', 'UNVERIFIED')),
    CONSTRAINT chk_users_gender CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT chk_users_level CHECK (badminton_level IS NULL OR badminton_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'))
);

-- 2. BẢNG PASSWORD_RESETS (Mã xác thực Magic Link Quên Mật khẩu)
CREATE TABLE password_resets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_password_resets_token UNIQUE (token_hash)
);

-- 3. BẢNG REFRESH_TOKENS (Phiên làm việc JWT dài hạn)
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

-- 4. BẢNG MATCHES (Trận đấu cầu lông)
CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    player_a_name VARCHAR(100) NOT NULL,
    player_b_name VARCHAR(100) NOT NULL,
    upper_player VARCHAR(20) NOT NULL DEFAULT 'PLAYER_A',
    lower_player VARCHAR(20) NOT NULL DEFAULT 'PLAYER_B',
    match_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title VARCHAR(200),
    description TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'USER_UPLOAD',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_matches_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_matches_upper_player CHECK (upper_player IN ('PLAYER_A', 'PLAYER_B')),
    CONSTRAINT chk_matches_lower_player CHECK (lower_player IN ('PLAYER_A', 'PLAYER_B')),
    CONSTRAINT chk_matches_source CHECK (source IN ('USER_UPLOAD', 'ADMIN_CURATED')),
    CONSTRAINT chk_matches_status CHECK (status IN ('DRAFT', 'READY', 'ANALYZING', 'ANALYZED', 'PUBLISHED'))
);

-- 5. BẢNG VIDEOS (Video trận đấu - Quan hệ 1:1 với MATCHES)
CREATE TABLE videos (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'video/mp4',
    file_size BIGINT NOT NULL,
    duration_seconds NUMERIC(10, 2),
    width INT,
    height INT,
    fps NUMERIC(5, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_videos_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT uq_videos_match_id UNIQUE (match_id),
    CONSTRAINT chk_videos_status CHECK (status IN ('UPLOADING', 'UPLOADED', 'READY', 'FAILED'))
);

-- 6. BẢNG AI_ANALYSES (Các phiên phân tích thị giác máy tính)
CREATE TABLE ai_analyses (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL,
    video_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    model_name VARCHAR(100) NOT NULL DEFAULT 'BadmintonVision',
    model_version VARCHAR(100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code VARCHAR(100),
    error_message TEXT,
    court_corners JSONB,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_analyses_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_analyses_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    CONSTRAINT chk_analyses_status CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'UNSUPPORTED', 'CANCELLED'))
);

-- 7. BẢNG AI_EVENTS (Sự kiện các cú đánh do AI phát hiện)
CREATE TABLE ai_events (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    event_order INT NOT NULL,
    start_frame INT NOT NULL,
    hit_frame INT NOT NULL,
    end_frame INT NOT NULL,
    time_seconds NUMERIC(10, 3) NOT NULL,
    player_side VARCHAR(20) NOT NULL,
    stroke VARCHAR(50) NOT NULL,
    stroke_side VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    confidence NUMERIC(4, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_analysis FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT chk_events_player_side CHECK (player_side IN ('UPPER', 'LOWER')),
    CONSTRAINT chk_events_stroke CHECK (stroke IN ('SERVE', 'SMASH', 'CLEAR', 'DROP', 'LIFT', 'DRIVE', 'NET_SHOT', 'PUSH', 'UNKNOWN')),
    CONSTRAINT chk_events_stroke_side CHECK (stroke_side IN ('FOREHAND', 'BACKHAND', 'AROUNDHEAD', 'UNKNOWN')),
    CONSTRAINT chk_events_confidence CHECK (confidence >= 0.000 AND confidence <= 1.000)
);

-- 8. BẢNG RALLIES (Các pha cầu được phân đoạn)
CREATE TABLE rallies (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL,
    analysis_id BIGINT NOT NULL,
    rally_number INT NOT NULL,
    start_event_id BIGINT NOT NULL,
    end_event_id BIGINT NOT NULL,
    start_time NUMERIC(10, 3) NOT NULL,
    end_time NUMERIC(10, 3) NOT NULL,
    duration NUMERIC(10, 3) NOT NULL,
    total_strokes INT NOT NULL,
    boundary_type VARCHAR(30) NOT NULL DEFAULT 'TIME_GAP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rallies_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_rallies_analysis FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT fk_rallies_start_event FOREIGN KEY (start_event_id) REFERENCES ai_events(id) ON DELETE CASCADE,
    CONSTRAINT fk_rallies_end_event FOREIGN KEY (end_event_id) REFERENCES ai_events(id) ON DELETE CASCADE,
    CONSTRAINT chk_rallies_boundary CHECK (boundary_type IN ('TIME_GAP', 'SHUTTLE_DEAD', 'SERVICE_DETECTED'))
);

-- 9. BẢNG MATCH_STATISTICS (Thống kê tổng hợp toàn trận đấu)
CREATE TABLE match_statistics (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL,
    analysis_id BIGINT NOT NULL,
    total_strokes INT NOT NULL DEFAULT 0,
    total_rallies INT NOT NULL DEFAULT 0,
    avg_strokes_per_rally NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    avg_rally_duration NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    player_a_strokes INT NOT NULL DEFAULT 0,
    player_b_strokes INT NOT NULL DEFAULT 0,
    forehand_count INT NOT NULL DEFAULT 0,
    backhand_count INT NOT NULL DEFAULT 0,
    aroundhead_count INT NOT NULL DEFAULT 0,
    unknown_side_count INT NOT NULL DEFAULT 0,
    avg_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stats_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_stats_analysis FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT uq_stats_analysis_id UNIQUE (analysis_id)
);

-- ==============================================================================
-- THIẾT KẾ CHỈ MỤC TỐI ƯU HIỆU NĂNG (INDEXES)
-- ==============================================================================

-- A. Chỉ mục cho User & Token
CREATE INDEX idx_password_resets_token ON password_resets(token_hash) WHERE is_used = FALSE;
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(token_hash) WHERE revoked = FALSE;

-- B. Chỉ mục Partial Index cho Matches Soft Delete (Xem trận đấu của tôi)
CREATE INDEX idx_matches_owner_active ON matches(owner_id, created_at DESC) WHERE deleted_at IS NULL;

-- C. Chỉ mục Partial Index cho Matches Public Library (Xem thư viện công khai)
CREATE INDEX idx_matches_public_browse ON matches(match_date DESC, created_at DESC) WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
CREATE INDEX idx_matches_search_players ON matches(player_a_name, player_b_name) WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

-- D. Chỉ mục Độc nhất (Partial Unique) cho phiên phân tích hiện tại (is_current)
-- Ràng buộc: Mỗi trận đấu chỉ có DUY NHẤT 1 phiên phân tích là is_current = TRUE
CREATE UNIQUE INDEX uq_ai_analyses_current_per_match ON ai_analyses(match_id) WHERE is_current = TRUE;

-- E. Chỉ mục Khóa ngoại cho Truy vấn Phân tích & Trạng thái
CREATE INDEX idx_ai_analyses_match_status ON ai_analyses(match_id, status);
CREATE INDEX idx_ai_analyses_status ON ai_analyses(status);

-- F. Chỉ mục phục vụ Video Replay Timeline & Stroke Markers
CREATE INDEX idx_ai_events_analysis_order ON ai_events(analysis_id, event_order ASC);
CREATE INDEX idx_ai_events_analysis_time ON ai_events(analysis_id, time_seconds ASC);

-- G. Chỉ mục phục vụ Danh sách Rallies & Sequence
CREATE INDEX idx_rallies_analysis_number ON rallies(analysis_id, rally_number ASC);
CREATE INDEX idx_rallies_time_range ON rallies(analysis_id, start_time, end_time);

