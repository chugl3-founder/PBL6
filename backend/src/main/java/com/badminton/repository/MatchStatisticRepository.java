package com.badminton.repository;

import com.badminton.entity.MatchStatistic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MatchStatisticRepository extends JpaRepository<MatchStatistic, Long> {

    Optional<MatchStatistic> findByAnalysisId(Long analysisId);

    void deleteByAnalysisId(Long analysisId);
}

