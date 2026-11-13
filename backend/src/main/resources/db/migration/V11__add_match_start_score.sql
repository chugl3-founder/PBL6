-- The game and per-player score when the video starts. The AI counts from 0-0 when it cannot read the
-- scoreboard, so the owner gives the real score for a clip that starts mid-game. Defaults: game 1, 0-0.
ALTER TABLE matches
    ADD COLUMN start_game SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN start_score_a SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN start_score_b SMALLINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_matches_start_game CHECK (start_game BETWEEN 1 AND 3),
    ADD CONSTRAINT chk_matches_start_score CHECK (start_score_a BETWEEN 0 AND 29 AND start_score_b BETWEEN 0 AND 29);
