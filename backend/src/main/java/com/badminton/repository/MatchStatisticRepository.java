package com.badminton.repository;

import com.badminton.entity.MatchStatistic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MatchStatisticRepository extends JpaRepository<MatchStatistic, Long> {

    Optional<MatchStatistic> findByAnalysisId(Long analysisId);

    void deleteByAnalysisId(Long analysisId);

    /** Stroke and rally totals of the current analysis of each match. */
    interface MatchTotals {
        Long getMatchId();

        Integer getTotalStrokes();

        Integer getTotalRallies();
    }

    /** The totals of a page of matches in one query, without loading the statistic entities. */
    @Query("SELECT s.match.id AS matchId, s.totalStrokes AS totalStrokes, s.totalRallies AS totalRallies "
            + "FROM MatchStatistic s WHERE s.analysis.isCurrent = true AND s.match.id IN :matchIds")
    List<MatchTotals> findCurrentTotalsByMatchIdIn(@Param("matchIds") Collection<Long> matchIds);
}

