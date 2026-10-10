package com.badminton.repository;

import com.badminton.entity.AiEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiEventRepository extends JpaRepository<AiEvent, Long> {

    List<AiEvent> findByAnalysisIdOrderByEventOrderAsc(Long analysisId);

    void deleteByAnalysisId(Long analysisId);
}

