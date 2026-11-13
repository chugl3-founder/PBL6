package com.badminton.service;

import com.badminton.config.RabbitMQConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Small jobs for the media worker other than highlight reels. A thumbnail is a nicety: when the broker is down
 * the card shows a placeholder, so failures are only logged.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MediaJobPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    /** Asks for a still frame of an uploaded video once the current transaction has committed the video row. */
    public void requestThumbnailAfterCommit(Long matchId, String videoStoragePath) {
        Runnable send = () -> send(matchId, videoStoragePath);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    private void send(Long matchId, String videoStoragePath) {
        try {
            Map<String, Object> job = new LinkedHashMap<>();
            job.put("type", "thumbnail");
            job.put("matchId", matchId);
            job.put("videoStoragePath", videoStoragePath);
            job.put("outputPath", "thumbnails/" + matchId + ".jpg");
            rabbitTemplate.convertAndSend(RabbitMQConfig.MEDIA_EXCHANGE_NAME, RabbitMQConfig.MEDIA_ROUTING_KEY,
                    objectMapper.writeValueAsString(job));
        } catch (Exception e) {
            log.warn("Could not queue a thumbnail for match {}: {}", matchId, e.getMessage());
        }
    }
}
