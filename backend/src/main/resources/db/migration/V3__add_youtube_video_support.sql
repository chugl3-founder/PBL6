-- ==============================================================================
-- FLYWAY MIGRATION V3: ADD YOUTUBE VIDEO SUPPORT AND PUBLIC MATCH INDEXES
-- PBL6 BADMINTON PLATFORM
-- ==============================================================================

-- 1. BỔ SUNG TRƯỜNG CHO VIDEO YOUTUBE VÀ NGUỒN PHÁT
ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS video_source_type VARCHAR(20) DEFAULT 'MINIO_UPLOAD',
    ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(50);

-- Cho phép file_size null hoặc 0 đối với video YouTube trực tuyến
ALTER TABLE videos ALTER COLUMN file_size DROP NOT NULL;

-- Ràng buộc loại nguồn phát hợp lệ
ALTER TABLE videos DROP CONSTRAINT IF EXISTS chk_video_source_type;
ALTER TABLE videos ADD CONSTRAINT chk_video_source_type 
    CHECK (video_source_type IN ('MINIO_UPLOAD', 'YOUTUBE'));

-- 2. TỐI ƯU HÓA TRUY VẤN THƯ VIỆN CÔNG KHAI
CREATE INDEX IF NOT EXISTS idx_matches_public_published 
    ON matches(status, source, created_at DESC) 
    WHERE deleted_at IS NULL;

