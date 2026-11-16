package com.badminton.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Scores rallies for a highlight reel and picks a default cut. Pure logic over {@link RallyFacts}, so the rules
 * can be tested without a database. Scores come from the AI, which can miss a point, so a rule only adds weight
 * and never excludes a rally on its own.
 */
public final class HighlightSelector {

    /** Seconds kept before the serve and after the last hit, so a clip does not start or end mid-action. */
    public static final double PRE_ROLL_SECONDS = 1.0;
    public static final double POST_ROLL_SECONDS = 2.0;

    /** The default cut aims for a short reel; the owner can add rallies up to the hard limits. */
    static final double TARGET_REEL_SECONDS = 120.0;
    static final int TARGET_CLIPS = 12;
    /** The reel must stay under the storage file cap (50 MB on Supabase); 3 minutes at 720p fits. */
    public static final double MAX_REEL_SECONDS = 180.0;
    public static final int MAX_CLIPS = 20;

    /** Below this a rally is only a filler, not worth suggesting. */
    static final int MIN_SUGGESTED_SCORE = 20;
    /** Suggested even below the bar, so the owner never starts from an empty selection. */
    static final int MIN_SUGGESTED_CLIPS = 3;
    /** Rally boundaries outside this range are almost always segmentation errors. */
    static final double MIN_RALLY_SECONDS = 2.0;
    static final double MAX_RALLY_SECONDS = 90.0;

    private static final Set<String> FINISHING_STROKES = Set.of("SMASH", "NET_ATTACK");


    private HighlightSelector() {
    }

    /** One rally as stored: scores are the AI's running count per court side, after the rally. */
    public record RallyFacts(
            long rallyId,
            int rallyNumber,
            double startTime,
            double endTime,
            int totalStrokes,
            String winnerSide,
            int scoreUpper,
            int scoreLower,
            String endStroke,
            String endHitterSide,
            boolean complete
    ) {
    }

    /** Scores are per player (A and B of the match) within the game, before the rally was played. */
    public record Candidate(
            long rallyId,
            int rallyNumber,
            double startTime,
            double endTime,
            double clipStart,
            double clipEnd,
            int totalStrokes,
            String winnerSide,
            int gameNumber,
            int scoreABefore,
            int scoreBBefore,
            int score,
            String label,
            List<String> reasons,
            boolean suggested
    ) {
        public double clipDuration() {
            return clipEnd - clipStart;
        }
    }

    /**
     * Where the rally stands in the match: game number, the per-player score before and after it, who won it
     * and whether player A was on the upper half of the court while it was played. afterMatch marks a rally
     * played once a player had already won two games: the AI picked up play after the match (warm-down,
     * replays), so it belongs to no game.
     */
    public record GameContext(int game, int aBefore, int bBefore, int aAfter, int bAfter, boolean aWon, boolean bWon,
                              boolean aOnUpper, boolean afterMatch) {
    }

    /**
     * The game and per-player score when the video starts. The AI counts from 0-0 when it cannot read the
     * scoreboard, so a clip that starts mid-game needs the owner to give the real starting score.
     */
    public record Start(int game, int scoreA, int scoreB) {
        public static final Start NONE = new Start(1, 0, 0);

        public static Start of(Integer game, Integer scoreA, Integer scoreB) {
            return new Start(game != null && game >= 1 && game <= 3 ? game : 1,
                    scoreA != null && scoreA >= 0 ? scoreA : 0,
                    scoreB != null && scoreB >= 0 ? scoreB : 0);
        }
    }

    /**
     * All usable rallies in rally order, each scored and labelled; the default cut is marked suggested.
     *
     * @param videoDuration     seconds, or null when unknown; clips are clamped to it
     * @param upperIsPlayerA    who was on the upper half of the court when the video starts
     */
    public static List<Candidate> rank(List<RallyFacts> rallies, Double videoDuration, boolean upperIsPlayerA) {
        return rank(rallies, videoDuration, upperIsPlayerA, Start.NONE);
    }

    public static List<Candidate> rank(List<RallyFacts> rallies, Double videoDuration, boolean upperIsPlayerA,
                                       Start start) {
        List<RallyFacts> ordered = new ArrayList<>(rallies);
        ordered.sort(Comparator.comparingInt(RallyFacts::rallyNumber));
        Map<Long, GameContext> games = trackGames(ordered, upperIsPlayerA, start);

        List<Candidate> scored = new ArrayList<>();
        for (RallyFacts r : ordered) {
            double length = r.endTime() - r.startTime();
            GameContext game = games.get(r.rallyId());
            if (!r.complete() || game.afterMatch() || length < MIN_RALLY_SECONDS || length > MAX_RALLY_SECONDS) {
                continue;
            }
            scored.add(score(r, game, videoDuration));
        }

        // Greedy by score under the target length, then shown in match order.
        List<Candidate> byScore = new ArrayList<>(scored);
        byScore.sort(Comparator.comparingInt(Candidate::score).reversed().thenComparingInt(Candidate::rallyNumber));
        Set<Long> picked = new HashSet<>();
        double total = 0;
        for (Candidate c : byScore) {
            // A short clip or a quiet match may have no standout rally; still offer the best few.
            boolean belowBar = c.score() < MIN_SUGGESTED_SCORE && picked.size() >= MIN_SUGGESTED_CLIPS;
            if (picked.size() >= TARGET_CLIPS || belowBar) {
                break;
            }
            if (total + c.clipDuration() > TARGET_REEL_SECONDS) {
                continue;
            }
            picked.add(c.rallyId());
            total += c.clipDuration();
        }

        List<Candidate> result = new ArrayList<>(scored.size());
        for (Candidate c : scored) {
            result.add(picked.contains(c.rallyId()) ? withSuggested(c) : c);
        }
        return result;
    }

    /**
     * Turns the AI's running per-side count into per-player scores within each game. The AI counts by court
     * half and does not always reset between games, while players change ends after every game and at 11 in
     * game 3. So the walk ends a game by the scoring rules, restarts it at 0-0 and follows who is on which half.
     * A count that drops below the game's starting point means the stored data already restarts per game.
     * Once a player has won two games (or a third game has ended) the match is over and later rallies are
     * marked afterMatch.
     */
    public static Map<Long, GameContext> trackGames(List<RallyFacts> ordered, boolean upperIsPlayerA) {
        return trackGames(ordered, upperIsPlayerA, Start.NONE);
    }

    public static Map<Long, GameContext> trackGames(List<RallyFacts> ordered, boolean upperIsPlayerA, Start start) {
        Map<Long, GameContext> out = new HashMap<>();
        int game = start.game();
        int offUpper = 0, offLower = 0;   // side counts when the game started
        int segUpper = 0, segLower = 0;   // per-game side counts when the players last changed ends
        int baseA = start.scoreA(), baseB = start.scoreB(); // player scores when the players last changed ends
        boolean aOnUpper = upperIsPlayerA;
        boolean switchedAt11 = game == 3 && Math.max(baseA, baseB) >= 11;
        int gamesA = 0, gamesB = 0;       // games won in this video; earlier games are unknown
        boolean matchOver = false;
        GameContext last = null;

        for (RallyFacts r : ordered) {
            if (matchOver) {
                // Keeps the final score of the match, so a scoreboard following the video does not jump.
                out.put(r.rallyId(), new GameContext(game, last.aAfter(), last.bAfter(), last.aAfter(), last.bAfter(),
                        false, false, last.aOnUpper(), true));
                continue;
            }
            int upper = r.scoreUpper() - offUpper;
            int lower = r.scoreLower() - offLower;
            if (upper < 0 || lower < 0) {
                offUpper = offLower = segUpper = segLower = baseA = baseB = 0;
                upper = r.scoreUpper();
                lower = r.scoreLower();
            }
            int a = baseA + (aOnUpper ? upper - segUpper : lower - segLower);
            int b = baseB + (aOnUpper ? lower - segLower : upper - segUpper);

            String winner = normalize(r.winnerSide());
            boolean aWon = ("UPPER".equals(winner) && aOnUpper) || ("LOWER".equals(winner) && !aOnUpper);
            boolean bWon = ("UPPER".equals(winner) && !aOnUpper) || ("LOWER".equals(winner) && aOnUpper);
            last = new GameContext(game, Math.max(0, a - (aWon ? 1 : 0)), Math.max(0, b - (bWon ? 1 : 0)),
                    Math.max(0, a), Math.max(0, b), aWon, bWon, aOnUpper, false);
            out.put(r.rallyId(), last);

            if ((aWon && winsGame(a, b)) || (bWon && winsGame(b, a))) {
                if (aWon) gamesA++;
                else gamesB++;
                matchOver = gamesA >= 2 || gamesB >= 2 || game >= 3;
                if (matchOver) {
                    continue;
                }
                game++;
                offUpper = r.scoreUpper();
                offLower = r.scoreLower();
                segUpper = segLower = baseA = baseB = 0;
                aOnUpper = !aOnUpper;   // players change ends after every game
                switchedAt11 = false;
            } else if (game == 3 && !switchedAt11 && Math.max(a, b) >= 11) {
                baseA = a;
                baseB = b;
                segUpper = upper;
                segLower = lower;
                aOnUpper = !aOnUpper;
                switchedAt11 = true;
            }
        }
        return out;
    }

    static Candidate score(RallyFacts r, GameContext g, Double videoDuration) {
        String winner = normalize(r.winnerSide());
        int score = Math.min(r.totalStrokes(), 30) * 2;
        List<String> reasons = new ArrayList<>();
        String label = null;

        if (g.aWon() || g.bWon()) {
            int winnerBefore = g.aWon() ? g.aBefore() : g.bBefore();
            int loserBefore = g.aWon() ? g.bBefore() : g.aBefore();
            if (winsGame(winnerBefore + 1, loserBefore)) {
                score += 40;
                reasons.add("Điểm kết thúc ván " + g.game());
                label = "Kết thúc ván " + g.game() + " · " + g.aAfter() + "-" + g.bAfter();
            } else if (hasGamePoint(loserBefore, winnerBefore)) {
                score += 30;
                reasons.add("Cứu điểm game");
                label = "Cứu điểm game ván " + g.game();
            }

            String endStroke = normalize(r.endStroke());
            if (FINISHING_STROKES.contains(endStroke) && winner.equals(normalize(r.endHitterSide()))) {
                score += 20;
                String name = "SMASH".equals(endStroke) ? "Smash ăn điểm" : "Tấn công lưới ăn điểm";
                reasons.add(name);
                if (label == null) {
                    label = name;
                }
            }
        }

        if (r.totalStrokes() >= 15) {
            reasons.add(0, "Pha cầu dài " + r.totalStrokes() + " cú");
            if (label == null || r.totalStrokes() >= 25) {
                label = label == null ? "Pha cầu " + r.totalStrokes() + " cú" : label + " · " + r.totalStrokes() + " cú";
            }
        }
        if (label == null) {
            // The rally number is shown next to the label already, so name the rally by its length.
            label = "Pha cầu " + r.totalStrokes() + " cú";
        }

        double clipStart = Math.max(0, r.startTime() - PRE_ROLL_SECONDS);
        double clipEnd = r.endTime() + POST_ROLL_SECONDS;
        if (videoDuration != null && videoDuration > 0) {
            clipEnd = Math.min(clipEnd, videoDuration);
        }

        return new Candidate(r.rallyId(), r.rallyNumber(), r.startTime(), r.endTime(), round(clipStart), round(clipEnd),
                r.totalStrokes(), winner, g.game(), g.aBefore(), g.bBefore(), score, label, List.copyOf(reasons), false);
    }

    /** 21 with a two-point lead, or 30 (the cap at 29-29). */
    static boolean winsGame(int winnerScore, int loserScore) {
        return winnerScore == 30 || (winnerScore >= 21 && winnerScore - loserScore >= 2);
    }

    /** The side has game point: one more rally would win the game. */
    static boolean hasGamePoint(int sideScore, int otherScore) {
        return winsGame(sideScore + 1, otherScore);
    }

    private static Candidate withSuggested(Candidate c) {
        return new Candidate(c.rallyId(), c.rallyNumber(), c.startTime(), c.endTime(), c.clipStart(), c.clipEnd(),
                c.totalStrokes(), c.winnerSide(), c.gameNumber(), c.scoreABefore(), c.scoreBBefore(), c.score(),
                c.label(), c.reasons(), true);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static double round(double seconds) {
        return Math.round(seconds * 1000.0) / 1000.0;
    }
}
