-- Queryable business projections derived from AI_Classifier analytics output.
-- raw_result in ai_analyses remains the lossless source of truth.

CREATE TABLE tactic_detections (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    rally_number INT NOT NULL,
    player_side VARCHAR(20) NOT NULL,
    player_name VARCHAR(100),
    tactic_code VARCHAR(50) NOT NULL,
    tactic_label VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    start_ball_round INT,
    end_ball_round INT,
    shot_count INT NOT NULL DEFAULT 0,
    evidence_quality VARCHAR(50),
    confidence_calibrated BOOLEAN NOT NULL DEFAULT FALSE,
    uses_landing_proxy BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tactic_detections_analysis FOREIGN KEY (analysis_id)
        REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT chk_tactic_player_side CHECK (player_side IN ('UPPER', 'LOWER')),
    CONSTRAINT chk_tactic_round_range CHECK (
        start_ball_round IS NULL OR end_ball_round IS NULL OR
        start_ball_round <= end_ball_round
    )
);

CREATE TABLE player_analysis_profiles (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    player_side VARCHAR(20) NOT NULL,
    player_name VARCHAR(100),
    total_shots INT NOT NULL DEFAULT 0,
    playstyle_label VARCHAR(100),
    playstyle_description TEXT,
    attack_score INT,
    defense_score INT,
    net_control_score INT,
    shot_variety_score INT,
    consistency_score INT,
    pace_score INT,
    profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_player_profiles_analysis FOREIGN KEY (analysis_id)
        REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT uq_player_profile_analysis_side UNIQUE (analysis_id, player_side),
    CONSTRAINT chk_profile_player_side CHECK (player_side IN ('UPPER', 'LOWER')),
    CONSTRAINT chk_profile_scores CHECK (
        (attack_score IS NULL OR attack_score BETWEEN 0 AND 100) AND
        (defense_score IS NULL OR defense_score BETWEEN 0 AND 100) AND
        (net_control_score IS NULL OR net_control_score BETWEEN 0 AND 100) AND
        (shot_variety_score IS NULL OR shot_variety_score BETWEEN 0 AND 100) AND
        (consistency_score IS NULL OR consistency_score BETWEEN 0 AND 100) AND
        (pace_score IS NULL OR pace_score BETWEEN 0 AND 100)
    )
);

CREATE TABLE rally_movement_metrics (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    rally_number INT NOT NULL,
    upper_distance_meters NUMERIC(10, 3),
    lower_distance_meters NUMERIC(10, 3),
    upper_position_samples INT NOT NULL DEFAULT 0,
    lower_position_samples INT NOT NULL DEFAULT 0,
    is_full_tracking_distance BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rally_movement_analysis FOREIGN KEY (analysis_id)
        REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT uq_rally_movement_analysis_number UNIQUE (analysis_id, rally_number),
    CONSTRAINT chk_rally_movement_non_negative CHECK (
        (upper_distance_meters IS NULL OR upper_distance_meters >= 0) AND
        (lower_distance_meters IS NULL OR lower_distance_meters >= 0) AND
        upper_position_samples >= 0 AND lower_position_samples >= 0
    )
);

CREATE TABLE coach_insights (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    insight_order INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    target VARCHAR(200),
    insight TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_coach_insights_analysis FOREIGN KEY (analysis_id)
        REFERENCES ai_analyses(id) ON DELETE CASCADE,
    CONSTRAINT uq_coach_insight_analysis_order UNIQUE (analysis_id, insight_order)
);

CREATE INDEX idx_tactic_analysis_rally
    ON tactic_detections(analysis_id, rally_number, player_side);
CREATE INDEX idx_tactic_code
    ON tactic_detections(tactic_code, analysis_id);
CREATE INDEX idx_player_profiles_analysis
    ON player_analysis_profiles(analysis_id);
CREATE INDEX idx_movement_analysis_rally
    ON rally_movement_metrics(analysis_id, rally_number);
CREATE INDEX idx_coach_insights_analysis
    ON coach_insights(analysis_id, insight_order);
