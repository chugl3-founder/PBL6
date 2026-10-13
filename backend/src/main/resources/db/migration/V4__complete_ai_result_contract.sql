-- Align PostgreSQL persistence with AI_Classifier schema 2.0_pbl6_coachai.
-- Keep the complete result for forward compatibility, while retaining the
-- normalized event/rally columns used by replay queries.

ALTER TABLE ai_analyses
    ADD COLUMN IF NOT EXISTS result_schema_version VARCHAR(50),
    ADD COLUMN IF NOT EXISTS raw_result JSONB,
    ADD COLUMN IF NOT EXISTS scoreboard_data JSONB,
    ADD COLUMN IF NOT EXISTS scoreboard_ocr_data JSONB,
    ADD COLUMN IF NOT EXISTS suppression_audit JSONB,
    ADD COLUMN IF NOT EXISTS worker_job_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ;

ALTER TABLE ai_events
    ADD COLUMN IF NOT EXISTS rally_number INT,
    ADD COLUMN IF NOT EXISTS hitter_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tta_used BOOLEAN,
    ADD COLUMN IF NOT EXISTS tta_windows INT;

-- Metadata emitted by the video section of the AI result.
ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS total_frames INT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_events_analysis_order
    ON ai_events(analysis_id, event_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rallies_analysis_number
    ON rallies(analysis_id, rally_number);

CREATE INDEX IF NOT EXISTS idx_ai_events_analysis_rally
    ON ai_events(analysis_id, rally_number, event_order);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_worker_job
    ON ai_analyses(worker_job_id)
    WHERE worker_job_id IS NOT NULL;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_matches_distinct_court_players;
ALTER TABLE matches ADD CONSTRAINT chk_matches_distinct_court_players
    CHECK (upper_player <> lower_player) NOT VALID;

ALTER TABLE ai_events DROP CONSTRAINT IF EXISTS chk_events_frame_order;
ALTER TABLE ai_events ADD CONSTRAINT chk_events_frame_order
    CHECK (start_frame <= hit_frame AND hit_frame <= end_frame) NOT VALID;

ALTER TABLE ai_events DROP CONSTRAINT IF EXISTS chk_events_rally_number;
ALTER TABLE ai_events ADD CONSTRAINT chk_events_rally_number
    CHECK (rally_number IS NULL OR rally_number > 0) NOT VALID;

ALTER TABLE ai_events DROP CONSTRAINT IF EXISTS chk_events_hitting_area;
ALTER TABLE ai_events ADD CONSTRAINT chk_events_hitting_area
    CHECK (hitting_area_3x3 IS NULL OR hitting_area_3x3 BETWEEN 1 AND 9) NOT VALID;

ALTER TABLE ai_events DROP CONSTRAINT IF EXISTS chk_events_landing_area;
ALTER TABLE ai_events ADD CONSTRAINT chk_events_landing_area
    CHECK (landing_area_3x3_proxy IS NULL OR landing_area_3x3_proxy BETWEEN 1 AND 9) NOT VALID;

ALTER TABLE ai_events DROP CONSTRAINT IF EXISTS chk_events_probability_fields;
ALTER TABLE ai_events ADD CONSTRAINT chk_events_probability_fields CHECK (
    (hit_score IS NULL OR hit_score BETWEEN 0 AND 1) AND
    (landing_proxy_confidence IS NULL OR landing_proxy_confidence BETWEEN 0 AND 1) AND
    (shuttle_visibility_ratio IS NULL OR shuttle_visibility_ratio BETWEEN 0 AND 1)
) NOT VALID;

ALTER TABLE rallies DROP CONSTRAINT IF EXISTS chk_rallies_time_order;
ALTER TABLE rallies ADD CONSTRAINT chk_rallies_time_order
    CHECK (start_time <= end_time AND duration >= 0 AND total_strokes >= 0) NOT VALID;

ALTER TABLE videos DROP CONSTRAINT IF EXISTS chk_videos_source_payload;
ALTER TABLE videos ADD CONSTRAINT chk_videos_source_payload CHECK (
    (video_source_type = 'MINIO_UPLOAD' AND storage_path IS NOT NULL AND storage_path <> '') OR
    (video_source_type = 'YOUTUBE' AND youtube_video_id IS NOT NULL AND youtube_video_id <> '')
) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry
    ON refresh_tokens(expires_at) WHERE revoked = FALSE;

CREATE INDEX IF NOT EXISTS idx_password_resets_expiry
    ON password_resets(expires_at) WHERE is_used = FALSE;
