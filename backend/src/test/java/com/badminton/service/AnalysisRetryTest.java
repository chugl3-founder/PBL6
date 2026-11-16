package com.badminton.service;

import com.badminton.common.exception.ApiException;
import com.badminton.config.RabbitMQConfig;
import com.badminton.entity.AiAnalysis;
import com.badminton.entity.Match;
import com.badminton.entity.Video;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.AnalysisQueueRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.VideoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.ConnectException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A retry must reach the AI worker like a first run, not fall back to the Mock Engine on its own. */
@ExtendWith(MockitoExtension.class)
class AnalysisRetryTest {

    private static final String OWNER = "owner@badminton.vn";

    @Mock
    private MatchAccessService matchAccess;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private VideoRepository videoRepository;
    @Mock
    private AiAnalysisRepository aiAnalysisRepository;
    @Mock
    private AnalysisQueueRepository analysisQueueRepository;
    @Mock
    private AnalysisJobPublisher jobPublisher;
    @Mock
    private AnalysisMapper mapper;
    @Mock
    private TransactionTemplate transactionTemplate;
    @InjectMocks
    private AnalysisService analysisService;

    private final Match match = Match.builder().id(5L).status("READY").build();

    private AiAnalysis failedOnYoutube() {
        Video video = Video.builder().id(9L).storagePath("youtube/abc").videoSourceType("YOUTUBE")
                .youtubeUrl("https://www.youtube.com/watch?v=abc").build();
        return AiAnalysis.builder().id(40L).match(match).video(video).status("FAILED").build();
    }

    @SuppressWarnings("unchecked")
    private void runTransactionsInline() {
        when(transactionTemplate.execute(any())).thenAnswer(inv ->
                ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
    }

    @Test
    void retryQueuesANewAnalysisAndSendsItToTheWorker() {
        runTransactionsInline();
        when(matchAccess.requireOwnerOrAdmin(5L, OWNER)).thenReturn(match);
        when(aiAnalysisRepository.findById(40L)).thenReturn(Optional.of(failedOnYoutube()));
        when(aiAnalysisRepository.saveAndFlush(any())).thenAnswer(inv -> {
            AiAnalysis created = inv.getArgument(0);
            created.setId(41L);
            return created;
        });

        var response = analysisService.retryAnalysis(5L, 40L, OWNER);

        assertThat(response.getAnalysisId()).isEqualTo(41L);
        assertThat(response.getStatus()).isEqualTo("QUEUED");
        assertThat(match.getStatus()).isEqualTo("ANALYZING");
        verify(aiAnalysisRepository).demoteAllCurrentByMatchId(5L);
        verify(jobPublisher).publish(new AnalysisJobPublisher.AnalysisJob(
                41L, 5L, "youtube/abc", "https://www.youtube.com/watch?v=abc"));
    }

    @Test
    void onlyAFailedAnalysisCanBeRetried() {
        runTransactionsInline();
        AiAnalysis completed = failedOnYoutube();
        completed.setStatus("COMPLETED");
        when(matchAccess.requireOwnerOrAdmin(5L, OWNER)).thenReturn(match);
        when(aiAnalysisRepository.findById(40L)).thenReturn(Optional.of(completed));

        assertThatThrownBy(() -> analysisService.retryAnalysis(5L, 40L, OWNER))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getCode()).isEqualTo("ERR_ANALYSIS_NOT_FAILED"));
        verify(jobPublisher, never()).publish(any());
    }

    @Test
    void adminRetryAlsoGoesThroughThePublisher() {
        runTransactionsInline();
        AiAnalysis cancelled = failedOnYoutube();
        cancelled.setStatus("CANCELLED");
        when(aiAnalysisRepository.findById(40L)).thenReturn(Optional.of(cancelled));
        when(aiAnalysisRepository.saveAndFlush(any())).thenAnswer(inv -> {
            AiAnalysis created = inv.getArgument(0);
            created.setId(42L);
            return created;
        });

        analysisService.retryAnalysisForAdmin(40L);

        verify(jobPublisher).publish(new AnalysisJobPublisher.AnalysisJob(
                42L, 5L, "youtube/abc", "https://www.youtube.com/watch?v=abc"));
    }

    @Test
    void publisherFallsBackToTheMockOnlyWhenTheBrokerIsDown() {
        RabbitTemplate rabbit = mock(RabbitTemplate.class);
        MockAiEngineService mockEngine = mock(MockAiEngineService.class);
        AnalysisJobPublisher publisher = new AnalysisJobPublisher(rabbit, mockEngine, new ObjectMapper());
        AnalysisJobPublisher.AnalysisJob job = new AnalysisJobPublisher.AnalysisJob(1L, 2L, "matches/2/a.mp4", null);

        publisher.publish(job);
        verify(rabbit).convertAndSend(eq(RabbitMQConfig.EXCHANGE_NAME), eq(RabbitMQConfig.ROUTING_KEY), anyString());
        verify(mockEngine, never()).runMockAnalysis(any());

        doThrow(new AmqpConnectException(new ConnectException("down")))
                .when(rabbit).convertAndSend(anyString(), anyString(), anyString());
        publisher.publish(job);
        verify(mockEngine).runMockAnalysis(1L);
    }
}
