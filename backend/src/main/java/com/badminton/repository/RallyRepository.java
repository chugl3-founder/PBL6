package com.badminton.repository;

import com.badminton.entity.Rally;
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
    }

    /** The rallies of the current analysis of each match, in one query (match cards show the result). */
    @Query("SELECT r.match.id AS matchId, r.id AS id, r.rallyNumber AS rallyNumber, r.winnerSide AS winnerSide, "
            + "r.scoreUpper AS scoreUpper, r.scoreLower AS scoreLower FROM Rally r "
            + "WHERE r.analysis.isCurrent = true AND r.match.id IN :matchIds ORDER BY r.match.id, r.rallyNumber")
    List<RallyScore> findCurrentScoresByMatchIdIn(@Param("matchIds") Collection<Long> matchIds);
}

