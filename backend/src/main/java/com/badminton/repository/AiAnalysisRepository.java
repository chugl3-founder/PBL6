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
}

