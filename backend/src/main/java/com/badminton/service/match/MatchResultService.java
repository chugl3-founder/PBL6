package com.badminton.service.match;

import com.badminton.service.highlight.HighlightSelector;
import com.badminton.dto.match.MatchResult;
import com.badminton.entity.match.Match;
import com.badminton.repository.analysis.RallyRepository;
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
            if (g != null && !g.outsideMatch()) {
                lastOfGame.put(g.game(), g);
            }
        }
        List<MatchResult.GameScore> scores = new ArrayList<>();
        int wonA = 0;
        int wonB = 0;
        int gameIndex = 0;
        for (HighlightSelector.GameContext g : lastOfGame.values()) {
            boolean finished = (g.aWon() && HighlightSelector.winsGame(g.aAfter(), g.bAfter()))
                    || (g.bWon() && HighlightSelector.winsGame(g.bAfter(), g.aAfter()));
            int a = g.aAfter();
            int b = g.bAfter();
            // A later game exists, so this one ended: the AI missed its last rally (20-15 is no final score).
            // The leader won it; at game point that rally is the one missing point.
            boolean later = ++gameIndex < lastOfGame.size();
            if (!finished && later && a != b) {
                if (a > b && HighlightSelector.hasGamePoint(a, b)) a++;
                else if (b > a && HighlightSelector.hasGamePoint(b, a)) b++;
                finished = true;
            }
            scores.add(new MatchResult.GameScore(a, b, finished));
            if (finished && a > b) wonA++;
            if (finished && b > a) wonB++;
        }
        // Broadcasts often cut to a close-up during the match point, so its rally is not seen and the
        // last game stops one short (20-12). A match does not end on match point: when the leader of
        // the last game had match point there, they won the next rally.
        // Not when the owner analysed only a part of the video that ends earlier: the match goes on
        // after that part, so a game point at its end decides nothing.
        boolean partialVideo = Boolean.TRUE.equals(rallies.get(0).getPartialVideo());
        if (!partialVideo && !scores.isEmpty() && !scores.get(scores.size() - 1).finished()) {
            MatchResult.GameScore last = scores.get(scores.size() - 1);
            if (wonA == 1 && HighlightSelector.hasGamePoint(last.scoreA(), last.scoreB())) {
                scores.set(scores.size() - 1, new MatchResult.GameScore(last.scoreA() + 1, last.scoreB(), true));
                wonA++;
            } else if (wonB == 1 && HighlightSelector.hasGamePoint(last.scoreB(), last.scoreA())) {
                scores.set(scores.size() - 1, new MatchResult.GameScore(last.scoreA(), last.scoreB() + 1, true));
                wonB++;
            }
        }
        String winner = wonA >= 2 ? "PLAYER_A" : wonB >= 2 ? "PLAYER_B" : null;
        // The same rallies the Replay lists: in the match, won by a known side or not decided yet.
        int matchRallies = (int) facts.stream()
                .filter(r -> games.get(r.rallyId()) != null && !games.get(r.rallyId()).outsideMatch())
                .filter(r -> r.winnerSide() == null || r.winnerSide().isBlank()
                        || "UPPER".equalsIgnoreCase(r.winnerSide()) || "LOWER".equalsIgnoreCase(r.winnerSide()))
                .count();
        return new MatchResult(scores, winner, matchRallies);
    }
}
