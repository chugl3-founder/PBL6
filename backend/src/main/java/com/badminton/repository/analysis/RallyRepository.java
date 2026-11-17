package com.badminton.repository.analysis;

import com.badminton.entity.analysis.Rally;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RallyRepository extends JpaRepository<Rally, Long> {

    List<Rally> findByAnalysisIdOrderByRallyNumberAsc(Long analysisId);

    void deleteByAnalysisId(Long analysisId);

    /** What the score of a rally needs, without loading the entity. */
    interface RallyScore {
        Long getMatchId();

        Long getId();

        Integer getRallyNumber();

        String getWinnerSide();

        Integer getScoreUpper();

        Integer getScoreLower();

        String getWinReason();

        /** True when only a part of a YouTube video ending before the video's end was analysed. */
        Boolean getPartialVideo();
    }

    /** The rallies of the current analysis of each match, in one query (match cards show the result). */
    @Query("SELECT r.match.id AS matchId, r.id AS id, r.rallyNumber AS rallyNumber, r.winnerSide AS winnerSide, "
            + "r.scoreUpper AS scoreUpper, r.scoreLower AS scoreLower, r.winReason AS winReason, "
            + "CASE WHEN r.analysis.video.segmentEndSeconds IS NOT NULL THEN true ELSE false END AS partialVideo "
            + "FROM Rally r "
            + "WHERE r.analysis.isCurrent = true AND r.match.id IN :matchIds ORDER BY r.match.id, r.rallyNumber")
    List<RallyScore> findCurrentScoresByMatchIdIn(@Param("matchIds") Collection<Long> matchIds);
}

