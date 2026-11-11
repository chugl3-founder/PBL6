-- Scouting reports: a game plan against one opponent, generated from that opponent's cross-match
-- record and stored as a snapshot so it stays stable and can be shared by link.

CREATE TABLE scouting_reports (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    opponent_name VARCHAR(100) NOT NULL,
    own_player_name VARCHAR(100),
    coach_notes TEXT,
    plan_data JSONB NOT NULL,
    share_token VARCHAR(64),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_scouting_reports_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_scouting_reports_share_token UNIQUE (share_token)
);

CREATE INDEX idx_scouting_reports_owner ON scouting_reports(owner_id, updated_at DESC);
