-- Highlight reels: an MP4 cut from the best rallies of one analysis, rendered by the media worker.
-- clips is a snapshot of the cut list (times already padded), so the reel stays reproducible even if
-- the analysis is re-run.

CREATE TABLE highlight_reels (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL,
    analysis_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED', -- QUEUED, RENDERING, COMPLETED, FAILED
    progress_percent INTEGER NOT NULL DEFAULT 0,
    clips JSONB NOT NULL,
    storage_path VARCHAR(500),
    duration_seconds NUMERIC(10, 3),
    file_size BIGINT,
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_highlight_reels_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_highlight_reels_analysis FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT fk_highlight_reels_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_highlight_reels_status CHECK (status IN ('QUEUED', 'RENDERING', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_highlight_reels_progress CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE INDEX idx_highlight_reels_match ON highlight_reels(match_id, created_at DESC);
