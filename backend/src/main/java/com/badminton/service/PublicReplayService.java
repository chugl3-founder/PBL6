package com.badminton.service;

import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.dto.video.VideoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Cached read side of the public Replay page. Each API otherwise costs 2 to 11 database round trips,
 * which limits throughput to what the connection pool can hold. Failures are never cached.
 */
@Service
@RequiredArgsConstructor
public class PublicReplayService {

    private final MatchService matchService;
    private final VideoService videoService;
    private final ReplayDataService replayDataService;

    @Cacheable(cacheNames = "publicVideo", key = "#id", sync = true)
    public VideoResponse getVideo(Long id) {
        return videoService.getPublicVideoByMatchId(id);
    }

    @Cacheable(cacheNames = "publicEvents", key = "#id", sync = true)
    public List<AiEventResponse> getEvents(Long id) {
        matchService.ensurePublished(id);
        return replayDataService.getPublishedEvents(id);
    }

    @Cacheable(cacheNames = "publicRallies", key = "#id", sync = true)
    public List<RallyResponse> getRallies(Long id) {
        matchService.ensurePublished(id);
        return replayDataService.getPublishedRallies(id);
    }

    @Cacheable(cacheNames = "publicStatistics", key = "#id", sync = true)
    public MatchStatisticsResponse getStatistics(Long id) {
        matchService.ensurePublished(id);
        return replayDataService.getPublishedStatistics(id);
    }
}
