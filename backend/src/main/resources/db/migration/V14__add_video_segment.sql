-- The part of a YouTube video to analyse, in seconds of the original video.
-- NULL start means from the beginning, NULL end means to the end of the video.
ALTER TABLE videos
    ADD COLUMN segment_start_seconds NUMERIC(10, 2),
    ADD COLUMN segment_end_seconds NUMERIC(10, 2),
    ADD CONSTRAINT chk_videos_segment CHECK (
        (segment_start_seconds IS NULL OR segment_start_seconds >= 0)
        AND (segment_end_seconds IS NULL OR segment_end_seconds > COALESCE(segment_start_seconds, 0))
    );
