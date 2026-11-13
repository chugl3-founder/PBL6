package com.badminton.service;

import com.badminton.dto.match.MatchResult;
import com.badminton.entity.Match;
import com.badminton.repository.RallyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Match results for match cards, for a whole page of matches with one query. Games are split and followed
 * across ends the same way as on the Replay page (HighlightSelector.trackGames).
 */
@Service
@RequiredArgsConstructor
public class MatchResultService {

    private final RallyRepository rallyRepository;

    /** Result per match id; matches without analysed rallies are left out. */
    public Map<Long, MatchResult> resultsFor(List<Match> matches) {
        if (matches.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<RallyRepository.RallyScore>> byMatch = rallyRepository
                .findCurrentScoresByMatchIdIn(matches.stream().map(Match::getId).toList()).stream()
                .collect(Collectors.groupingBy(RallyRepository.RallyScore::getMatchId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, MatchResult> results = new HashMap<>();
        for (Match match : matches) {
            List<RallyRepository.RallyScore> rallies = byMatch.get(match.getId());
            if (rallies != null && !rallies.isEmpty()) {
                results.put(match.getId(), resultOf(match, rallies));
            }
        }
        return results;
    }

    static MatchResult resultOf(Match match, List<RallyRepository.RallyScore> rallies) {
        List<HighlightSelector.RallyFacts> facts = rallies.stream()
                .map(r -> new HighlightSelector.RallyFacts(r.getId(), r.getRallyNumber(), 0, 0, 0, r.getWinnerSide(),
                        r.getScoreUpper() != null ? r.getScoreUpper() : 0,
                        r.getScoreLower() != null ? r.getScoreLower() : 0, null, null, true))
                .toList();
        Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(facts,
                !"PLAYER_B".equalsIgnoreCase(match.getUpperPlayer()),
                HighlightSelector.Start.of(match.getStartGame(), match.getStartScoreA(), match.getStartScoreB()));

        // The last rally of each game holds its score; it finished when that rally won it.
        Map<Integer, HighlightSelector.GameContext> lastOfGame = new LinkedHashMap<>();
        for (HighlightSelector.RallyFacts r : facts) {
            HighlightSelector.GameContext g = games.get(r.rallyId());
            if (g != null && !g.afterMatch()) {
                lastOfGame.put(g.game(), g);
            }
        }
        List<MatchResult.GameScore> scores = new ArrayList<>();
        int wonA = 0;
        int wonB = 0;
        for (HighlightSelector.GameContext g : lastOfGame.values()) {
            boolean finished = (g.aWon() && HighlightSelector.winsGame(g.aAfter(), g.bAfter()))
                    || (g.bWon() && HighlightSelector.winsGame(g.bAfter(), g.aAfter()));
            scores.add(new MatchResult.GameScore(g.aAfter(), g.bAfter(), finished));
            if (finished && g.aAfter() > g.bAfter()) wonA++;
            if (finished && g.bAfter() > g.aAfter()) wonB++;
        }
        String winner = wonA >= 2 ? "PLAYER_A" : wonB >= 2 ? "PLAYER_B" : null;
        return new MatchResult(scores, winner);
    }
}
