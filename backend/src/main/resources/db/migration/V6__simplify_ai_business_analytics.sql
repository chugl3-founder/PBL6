-- coach_insights is unstructured generated text already stored losslessly in
-- ai_analyses.coach_insights. Keeping a second relational copy adds writes but
-- no useful query capability.
DROP TABLE IF EXISTS coach_insights;

-- Detailed profile JSON is already stored in ai_analyses.player_profiles.
-- This projection keeps only the fields used for relational filtering and
-- cross-match statistics.
ALTER TABLE player_analysis_profiles
    DROP COLUMN IF EXISTS profile_data;
