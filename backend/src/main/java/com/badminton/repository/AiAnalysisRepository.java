package com.badminton.repository;

import com.badminton.entity.AiAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long> {

    Optional<AiAnalysis> findByMatchIdAndIsCurrentTrue(Long matchId);

    List<AiAnalysis> findByMatchIdOrderByCreatedAtDesc(Long matchId);

    Optional<AiAnalysis> findTopByMatchIdOrderByCreatedAtDesc(Long matchId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE AiAnalysis a SET a.isCurrent = false WHERE a.match.id = :matchId")
    void demoteAllCurrentByMatchId(@org.springframework.data.repository.query.Param("matchId") Long matchId);
}

