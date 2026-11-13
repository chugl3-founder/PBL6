package com.badminton.service;

import com.badminton.common.dto.PaginationMeta;
import com.badminton.dto.admin.PagedAnalysisResponse;
import com.badminton.entity.AiAnalysis;
import com.badminton.repository.AiAnalysisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The admin AI monitor: every analysis, newest first. Retrying one goes through AnalysisService. */
@Service
@RequiredArgsConstructor
public class AdminAnalysisService {

    private final AiAnalysisRepository aiAnalysisRepository;
    private final AnalysisMapper mapper;

    @Transactional(readOnly = true)
    public PagedAnalysisResponse getAllAnalyses(String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<AiAnalysis> analyses = status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())
                ? aiAnalysisRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(status.trim(), pageable)
                : aiAnalysisRepository.findAllByOrderByCreatedAtDesc(pageable);

        return PagedAnalysisResponse.builder()
                .data(analyses.getContent().stream().map(mapper::toAdminResponse).toList())
                .pagination(PaginationMeta.builder()
                        .page(analyses.getNumber())
                        .size(analyses.getSize())
                        .totalElements(analyses.getTotalElements())
                        .totalPages(analyses.getTotalPages())
                        .build())
                .build();
    }
}
