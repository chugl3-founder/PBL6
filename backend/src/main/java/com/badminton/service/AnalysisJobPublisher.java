package com.badminton.service;

import com.badminton.config.RabbitMQConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Hands an analysis to the AI worker through RabbitMQ. When the broker cannot be reached the Mock Engine runs
 * the analysis instead (AGENTS.md: mock data until the AI team plugs in). This is the only class that decides
 * between the real worker and the mock, so a first run and a retry always behave the same way.
 * Call it after the analysis row is committed: the worker must find it.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AnalysisJobPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final MockAiEngineService mockAiEngineService;
    private final ObjectMapper objectMapper;

    /** youtubeUrl is set only for a YouTube video: the worker downloads it instead of reading object storage. */
    public record AnalysisJob(Long analysisId, Long matchId, String videoStoragePath, String youtubeUrl) {
    }

    public void publish(AnalysisJob job) {
        try {
            Map<String, Object> message = new LinkedHashMap<>();
            message.put("analysisId", job.analysisId());
            message.put("matchId", job.matchId());
            message.put("videoStoragePath", job.videoStoragePath());
            if (job.youtubeUrl() != null) {
                message.put("youtubeUrl", job.youtubeUrl());
            }
            String payload = objectMapper.writeValueAsString(message);
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY, payload);
            log.info("Sent analysis job to the AI worker: {}", payload);
        } catch (Exception e) {
            log.warn("Could not reach RabbitMQ ({}), running analysis {} on the Mock Engine.",
                    e.getMessage(), job.analysisId());
            mockAiEngineService.runMockAnalysis(job.analysisId());
        }
    }

    /** Stops a mock run. The AI worker sees the CANCELLED status in the database by itself. */
    public void cancel(Long analysisId) {
        mockAiEngineService.cancelAnalysis(analysisId);
    }
}
