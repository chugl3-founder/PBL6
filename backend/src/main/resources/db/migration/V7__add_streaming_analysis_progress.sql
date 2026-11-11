-- Streaming analysis: the worker stores provisional ai_events/rallies while the video is
-- still being analysed; these columns tell the replay page how far the results reach.
-- The final save replaces the provisional rows and sets analyzed_until_seconds to the
-- full duration.
ALTER TABLE ai_analyses
    ADD COLUMN IF NOT EXISTS analyzed_until_seconds NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS video_duration_seconds NUMERIC(10, 2);
