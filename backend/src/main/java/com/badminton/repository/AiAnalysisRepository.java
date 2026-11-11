package com.badminton.repository;

import com.badminton.entity.AiAnalysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long> {

    Optional<AiAnalysis> findByMatchIdAndIsCurrentTrue(Long matchId);

    List<AiAnalysis> findByMatchIdOrderByCreatedAtDesc(Long matchId);

    Optional<AiAnalysis> findTopByMatchIdOrderByCreatedAtDesc(Long matchId);

    Page<AiAnalysis> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AiAnalysis> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status, Pageable pageable);

    long countByStatusIgnoreCase(String status);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE AiAnalysis a SET a.isCurrent = false WHERE a.match.id = :matchId")
    void demoteAllCurrentByMatchId(@org.springframework.data.repository.query.Param("matchId") Long matchId);

    /**
     * Sets only the viewer focus of a running analysis. A targeted update, because the GPU
     * worker writes progress columns and the final status of the same row concurrently.
     */
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(
            "UPDATE AiAnalysis a SET a.focusSeconds = :seconds, a.focusRequestedAt = :requestedAt "
                    + "WHERE a.id = :id AND a.status IN ('QUEUED', 'PROCESSING')")
    int updateFocusIfRunning(
            @org.springframework.data.repository.query.Param("id") Long id,
            @org.springframework.data.repository.query.Param("seconds") java.math.BigDecimal seconds,
            @org.springframework.data.repository.query.Param("requestedAt") java.time.OffsetDateTime requestedAt);
}

