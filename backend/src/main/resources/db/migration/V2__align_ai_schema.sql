-- ==============================================================================
-- FLYWAY MIGRATION V2: ALIGN AI DATA SCHEMAS WITH COACHAI+ 2.0 PIPELINE
-- PBL6 BADMINTON PLATFORM
-- ==============================================================================

-- 1. BẢNG AI_EVENTS: CẬP NHẬT RÀNG BUỘC CÚ ĐÁNH & BỔ SUNG CÁC TRƯỜNG KHÔNG GIAN, TỐC ĐỘ, QUỸ ĐẠO
-- Thêm 'NET_ATTACK' vào check constraint của stroke (AI model CoachAI+ phân loại net_attack riêng biệt)
ALTER TABLE ai_events DROP CONSTRAINT IF EXISTS chk_events_stroke;
ALTER TABLE ai_events ADD CONSTRAINT chk_events_stroke 
    CHECK (stroke IN ('SERVE', 'SMASH', 'CLEAR', 'DROP', 'LIFT', 'DRIVE', 'NET_SHOT', 'NET_ATTACK', 'PUSH', 'UNKNOWN'));

-- Bổ sung trường chi tiết tiếp xúc cầu & khung hình tinh chỉnh
ALTER TABLE ai_events
    ADD COLUMN IF NOT EXISTS refined_frame INT,
    ADD COLUMN IF NOT EXISTS contact_offset INT,
    ADD COLUMN IF NOT EXISTS hit_score NUMERIC(5, 4),
    ADD COLUMN IF NOT EXISTS ball_round INT,
    ADD COLUMN IF NOT EXISTS gap_from_previous_hit_seconds NUMERIC(8, 3),
    ADD COLUMN IF NOT EXISTS top2 JSONB,
    ADD COLUMN IF NOT EXISTS crop_box JSONB, -- [x1, y1, x2, y2]
    ADD COLUMN IF NOT EXISTS player_position_court JSONB, -- [x, y] normalized 0..1
    ADD COLUMN IF NOT EXISTS opponent_position_court JSONB, -- [x, y] normalized 0..1
    ADD COLUMN IF NOT EXISTS contact_shuttle_projection_court JSONB, -- [x, y] normalized 0..1
    ADD COLUMN IF NOT EXISTS contact_height_image_ratio NUMERIC(6, 4),
    ADD COLUMN IF NOT EXISTS hitting_area_3x3 INT, -- 1..9 zone
    ADD COLUMN IF NOT EXISTS landing_position_court_proxy JSONB, -- [x, y] normalized 0..1
    ADD COLUMN IF NOT EXISTS landing_area_3x3_proxy INT, -- 1..9 zone
    ADD COLUMN IF NOT EXISTS landing_proxy_frame INT,
    ADD COLUMN IF NOT EXISTS landing_proxy_confidence NUMERIC(5, 4),
    ADD COLUMN IF NOT EXISTS landing_is_proxy BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS flight_time_to_next_hit_seconds NUMERIC(8, 3),
    ADD COLUMN IF NOT EXISTS average_shuttle_speed_image_per_second NUMERIC(8, 3),
    ADD COLUMN IF NOT EXISTS average_wrist_speed_image_per_second NUMERIC(8, 3),
    ADD COLUMN IF NOT EXISTS shuttle_visibility_ratio NUMERIC(5, 4),
    ADD COLUMN IF NOT EXISTS attack_state_rule VARCHAR(50);


-- 2. BẢNG RALLIES: BỔ SUNG CÁC TRƯỜNG KẾT QUẢ ĐIỂM SỐ, NGƯỜI PHÁT CẦU, NGƯỜI THẮNG VÀ CHUỖI CÚ ĐÁNH
ALTER TABLE rallies
    ADD COLUMN IF NOT EXISTS server_side VARCHAR(20),
    ADD COLUMN IF NOT EXISTS winner_side VARCHAR(20),
    ADD COLUMN IF NOT EXISTS win_reason VARCHAR(100),
    ADD COLUMN IF NOT EXISTS score_upper INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS score_lower INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS score_text VARCHAR(50),
    ADD COLUMN IF NOT EXISTS stroke_sequence JSONB,
    ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS partial_start BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS partial_end BOOLEAN DEFAULT FALSE;

-- Ràng buộc giá trị hợp lệ cho server_side và winner_side
ALTER TABLE rallies DROP CONSTRAINT IF EXISTS chk_rallies_server_side;
ALTER TABLE rallies ADD CONSTRAINT chk_rallies_server_side 
    CHECK (server_side IS NULL OR server_side IN ('UPPER', 'LOWER', 'UNKNOWN'));

ALTER TABLE rallies DROP CONSTRAINT IF EXISTS chk_rallies_winner_side;
ALTER TABLE rallies ADD CONSTRAINT chk_rallies_winner_side 
    CHECK (winner_side IS NULL OR winner_side IN ('UPPER', 'LOWER', 'UNKNOWN'));


-- 3. BẢNG AI_ANALYSES: LƯU TRỮ METRICS TOÀN DIỆN TỪ COACHAI+ 2.0 (TACTICAL, RADAR, DISTRIBUTIONS)
ALTER TABLE ai_analyses
    ADD COLUMN IF NOT EXISTS summary_data JSONB,
    ADD COLUMN IF NOT EXISTS reliability_data JSONB,
    ADD COLUMN IF NOT EXISTS tactical_patterns JSONB,
    ADD COLUMN IF NOT EXISTS structured_tactics JSONB,
    ADD COLUMN IF NOT EXISTS movement_analytics JSONB,
    ADD COLUMN IF NOT EXISTS spatial_distribution_3x3 JSONB,
    ADD COLUMN IF NOT EXISTS player_profiles JSONB,
    ADD COLUMN IF NOT EXISTS radar_chart JSONB,
    ADD COLUMN IF NOT EXISTS response_transition_matrix JSONB,
    ADD COLUMN IF NOT EXISTS coach_insights JSONB,
    ADD COLUMN IF NOT EXISTS timing_seconds JSONB;

-- 4. BỔ SUNG INDEXES HỖ TRỢ TRUY VẤN SPATIAL VÀ TACTICAL
CREATE INDEX IF NOT EXISTS idx_ai_events_hitting_area ON ai_events(analysis_id, hitting_area_3x3);
CREATE INDEX IF NOT EXISTS idx_ai_events_stroke ON ai_events(analysis_id, stroke);
CREATE INDEX IF NOT EXISTS idx_rallies_winner ON rallies(analysis_id, winner_side);

