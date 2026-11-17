package com.badminton.service.analysis;

import com.badminton.repository.match.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps a match's status in step with its analyses. The GPU worker records a failure on the analysis row
 * only, so without this a match would show "AI đang phân tích" forever after a failed or lost job.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisStateReconciler {

    private final MatchRepository matchRepository;

    @Transactional
    @Scheduled(initialDelay = 15_000, fixedDelay = 60_000)
    public void releaseStuckMatches() {
        int released = matchRepository.releaseStuckAnalyzing();
        if (released > 0) {
            log.info("Released {} match(es) left in ANALYZING without a running analysis", released);
        }
    }
}
