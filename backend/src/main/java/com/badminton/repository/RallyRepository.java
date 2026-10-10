package com.badminton.repository;

import com.badminton.entity.Rally;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RallyRepository extends JpaRepository<Rally, Long> {

    List<Rally> findByAnalysisIdOrderByRallyNumberAsc(Long analysisId);

    void deleteByAnalysisId(Long analysisId);
}

