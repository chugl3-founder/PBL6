package com.badminton.repository;

import com.badminton.entity.AiAnalysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long> {

    Optional<AiAnalysis> findByMatchIdAndIsCurrentTrue(Long matchId);

    List<AiAnalysis> findByMatchIdOrderByCreatedAtDesc(Long matchId);

    Optional<AiAnalysis> findTopByMatchIdOrderByCreatedAtDesc(Long matchId);

    /** The current analysis of the match, or its latest one when none is marked current. */
    default Optional<AiAnalysis> findCurrentOrLatest(Long matchId) {
        return findByMatchIdAndIsCurrentTrue(matchId).or(() -> findTopByMatchIdOrderByCreatedAtDesc(matchId));
    }

    @EntityGraph(attributePaths = {"match", "match.owner", "video"})
    Page<AiAnalysis> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"match", "match.owner", "video"})
    Page<AiAnalysis> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status, Pageable pageable);

    long countByStatusIgnoreCase(String status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE AiAnalysis a SET a.isCurrent = false WHERE a.match.id = :matchId")
    void demoteAllCurrentByMatchId(@Param("matchId") Long matchId);

    /**
     * Sets only the viewer focus of a running analysis. A targeted update, because the GPU
     * worker writes progress columns and the final status of the same row concurrently.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            "UPDATE AiAnalysis a SET a.focusSeconds = :seconds, a.focusRequestedAt = :requestedAt "
                    + "WHERE a.id = :id AND a.status IN ('QUEUED', 'PROCESSING')")
    int updateFocusIfRunning(
            @Param("id") Long id,
            @Param("seconds") BigDecimal seconds,
            @Param("requestedAt") OffsetDateTime requestedAt);
}

