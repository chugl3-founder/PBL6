-- Viewer-driven streaming analysis: the replay page reports where the viewer seeks into
-- not-yet-analysed video; the GPU worker reads it and scans there first.
-- analyzed_ranges lists the [start, end] seconds whose hits are final, since with seeking
-- the analysed part of the video is no longer one prefix.
ALTER TABLE ai_analyses
    ADD COLUMN IF NOT EXISTS focus_seconds NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS focus_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS analyzed_ranges JSONB;
