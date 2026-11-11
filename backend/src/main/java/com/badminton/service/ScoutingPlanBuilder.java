package com.badminton.service;

import com.badminton.dto.player.PlayerProfileResponse;
import com.badminton.dto.player.PlayerProfileResponse.MatchEntry;
import com.badminton.dto.player.PlayerProfileResponse.Radar;
import com.badminton.dto.player.PlayerProfileResponse.RallyLengthStat;
import com.badminton.dto.player.PlayerProfileResponse.StrokeStat;
import com.badminton.dto.player.PlayerProfileResponse.ZoneCell;
import com.badminton.dto.scouting.ScoutingPlan;
import com.badminton.dto.scouting.ScoutingPlan.Clip;
import com.badminton.dto.scouting.ScoutingPlan.DataQuality;
import com.badminton.dto.scouting.ScoutingPlan.HeadToHead;
import com.badminton.dto.scouting.ScoutingPlan.HeadToHeadMatch;
import com.badminton.dto.scouting.ScoutingPlan.KeyPoint;
import com.badminton.dto.scouting.ScoutingPlan.StrokeCount;
import com.badminton.dto.scouting.ScoutingPlan.Subject;
import com.badminton.repository.PlayerStatsRepository.RallyEnd;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * Turns an opponent's cross-match record into a game plan. Every key point is a plain rule over
 * counted data with a minimum sample, and cites the rallies it was drawn from. Pure: no I/O.
 */
final class ScoutingPlanBuilder {

    private static final int MAX_CLIPS = 5;
    /** A clip starts this long before the rally-ending shot, but never before the rally. */
    private static final double CLIP_LEAD_SECONDS = 6;

    private static final Map<String, String> STROKES = Map.of(
            "SMASH", "đập cầu", "DROP", "bỏ nhỏ", "CLEAR", "phông cầu", "SERVE", "giao cầu",
            "LIFT", "hất cầu", "DRIVE", "tạt cầu", "NET_SHOT", "kéo lưới", "NET_ATTACK", "vồ lưới",
            "PUSH", "đẩy cầu");

    private record Axis(String key, String label, Function<Radar, Integer> value, String whenWeak, String whenStrong) {
    }

    private static final List<Axis> AXES = List.of(
            new Axis("attack", "tấn công", Radar::attack,
                    "Đối thủ ít chủ động tấn công: có thể đưa cầu cao sâu để giành thế trận.",
                    "Hạn chế đưa cầu cao ngắn ra giữa sân, đó là cơ hội đập cầu của đối thủ."),
            new Axis("defense", "phòng thủ", Radar::defense,
                    "Tấn công liên tục, ép đối thủ vào thế phòng thủ.",
                    "Đừng vội kết thúc; chuẩn bị cho pha cầu kéo dài và chọn thời điểm dứt điểm."),
            new Axis("netControl", "kiểm soát lưới", Radar::netControl,
                    "Chủ động đưa cầu lên lưới, đối thủ ít xử lý tốt ở đây.",
                    "Tránh tranh chấp lưới kéo dài; đẩy cầu ra cuối sân."),
            new Axis("shotVariety", "đa dạng cú đánh", Radar::shotVariety,
                    "Đối thủ ít biến hoá: đọc trước hướng cầu và đón sớm.",
                    "Đối thủ biến hoá nhiều: giữ vị trí trung tâm, đừng đoán sớm."),
            new Axis("consistency", "ổn định", Radar::consistency,
                    "Kéo dài pha cầu an toàn để chờ đối thủ mắc lỗi.",
                    "Đối thủ ít mắc lỗi: phải tự tạo điểm, đừng chờ lỗi."),
            new Axis("pace", "tốc độ", Radar::pace,
                    "Tăng nhịp, đánh nhanh và thấp để đối thủ không kịp về vị trí.",
                    "Giảm nhịp bằng cầu cao sâu, không để trận đấu bị cuốn theo tốc độ của đối thủ."));

    private ScoutingPlanBuilder() {
    }

    static ScoutingPlan build(PlayerProfileResponse opp, PlayerProfileResponse own, List<RallyEnd> ends) {
        List<KeyPoint> keys = new ArrayList<>();
        int decided = opp.totals().ralliesWon() + opp.totals().ralliesLost();

        // 1. TARGET: where the opponent loses points.
        List<ZoneCell> conceded = opp.zones().conceded();
        int concededTotal = conceded.stream().mapToInt(ZoneCell::count).sum();
        topZone(conceded).filter(z -> z.count >= 3).ifPresent(z -> keys.add(new KeyPoint(
                "TARGET",
                "Đánh vào " + z.name + " của đối thủ",
                "Đây là vùng đối thủ để mất điểm nhiều nhất: cú kết thúc của người gặp họ rơi vào đây "
                        + z.count + " trên " + concededTotal + " lần có vị trí.",
                pct(z.count, concededTotal) + "% điểm mất",
                clips(ends, e -> !e.playerWon() && !e.byPlayer() && zoneOf(e).map(z.name::equals).orElse(false)))));

        // 2. EXPLOIT: the opponent's own stroke that most often ends a rally they lose.
        opp.strokes().stream().filter(s -> s.errors() >= 2)
                .max(Comparator.comparingInt(StrokeStat::errors))
                .ifPresent(s -> keys.add(new KeyPoint(
                        "EXPLOIT",
                        "Ép đối thủ phải " + stroke(s.stroke()),
                        "Đối thủ mất điểm " + s.errors() + " lần ngay sau cú " + stroke(s.stroke())
                                + " của chính mình. Đưa cầu vào tình huống buộc họ dùng cú này.",
                        s.errors() + " lần mất điểm",
                        clips(ends, e -> !e.playerWon() && e.byPlayer() && s.stroke().equals(e.stroke())))));

        // 3. THREAT: the opponent's best finishing stroke, and where their shots land.
        opp.strokes().stream().filter(s -> s.winners() >= 2)
                .max(Comparator.comparingInt(StrokeStat::winners))
                .ifPresent(s -> keys.add(new KeyPoint(
                        "THREAT",
                        "Phòng bị cú " + stroke(s.stroke()),
                        "Vũ khí ghi điểm chính của đối thủ: " + s.winners() + " pha cầu kết thúc có lợi bằng cú "
                                + stroke(s.stroke()) + ". Đừng tạo thời cơ cho cú này.",
                        s.winners() + " điểm ghi được",
                        clips(ends, e -> e.playerWon() && e.byPlayer() && s.stroke().equals(e.stroke())))));
        List<ZoneCell> landing = opp.zones().landing().stream().map(ScoutingPlanBuilder::mirror).toList();
        int landingTotal = landing.stream().mapToInt(ZoneCell::count).sum();
        topZone(landing).filter(z -> landingTotal >= 30 && pct(z.count, landingTotal) >= 25).ifPresent(z -> keys.add(new KeyPoint(
                "THREAT",
                "Chờ cầu ở " + z.name + " (sân bạn)",
                "Đối thủ đưa " + pct(z.count, landingTotal) + "% số cú về vùng này. Đứng chờ lệch về đây một chút.",
                pct(z.count, landingTotal) + "% số cú",
                List.of())));

        // 4. TEMPO: short versus long rallies.
        tempo(opp.rallyLength()).ifPresent(keys::add);

        // 5. STYLE: the opponent's weakest and strongest style axis.
        style(opp.radar()).forEach(keys::add);

        return new ScoutingPlan(
                subject(opp),
                own == null ? null : subject(own),
                own == null ? null : headToHead(opp, own.name()),
                keys,
                conceded.stream().map(ScoutingPlanBuilder::mirror).toList(),
                landing,
                opp.strokes().stream().filter(s -> s.winners() > 0)
                        .sorted(Comparator.comparingInt(StrokeStat::winners).reversed())
                        .map(s -> new StrokeCount(s.stroke(), s.winners(), s.total())).toList(),
                opp.strokes().stream().filter(s -> s.errors() > 0)
                        .sorted(Comparator.comparingInt(StrokeStat::errors).reversed())
                        .map(s -> new StrokeCount(s.stroke(), s.errors(), s.total())).toList(),
                opp.rallyLength(),
                quality(opp.analyzedMatchCount(), decided));
    }

    /* ------------------------------------------------------------------ rules */

    private static Optional<KeyPoint> tempo(List<RallyLengthStat> buckets) {
        RallyLengthStat shortest = bucket(buckets, "SHORT");
        RallyLengthStat longest = bucket(buckets, "LONG");
        RallyLengthStat medium = bucket(buckets, "MEDIUM");
        // Short and medium rallies together are the "quick" side; long ones need 10+ shots.
        int quickWon = shortest.won() + medium.won();
        int quickLost = shortest.lost() + medium.lost();
        if (quickWon + quickLost < 4 || longest.won() + longest.lost() < 4) {
            return Optional.empty();
        }
        int quickRate = pct(quickWon, quickWon + quickLost);
        int longRate = pct(longest.won(), longest.won() + longest.lost());
        if (Math.abs(quickRate - longRate) < 15) {
            return Optional.empty();
        }
        boolean weakInLong = longRate < quickRate;
        return Optional.of(new KeyPoint(
                "TEMPO",
                weakInLong ? "Kéo dài pha cầu" : "Kết thúc pha cầu sớm",
                "Đối thủ thắng " + longRate + "% pha dài (10+ cú) so với " + quickRate + "% pha ngắn hơn. "
                        + (weakInLong ? "Kiên nhẫn giữ cầu, đối thủ đuối dần khi pha cầu kéo dài."
                                      : "Đối thủ mạnh lên khi pha cầu kéo dài: chủ động tấn công sớm."),
                longRate + "% vs " + quickRate + "%",
                List.of()));
    }

    private static List<KeyPoint> style(Radar radar) {
        List<KeyPoint> points = new ArrayList<>();
        List<Axis> present = AXES.stream().filter(a -> a.value.apply(radar) != null).toList();
        if (present.size() < 3) {
            return points;
        }
        Axis weakest = present.stream().min(Comparator.comparingInt(a -> a.value.apply(radar))).orElseThrow();
        Axis strongest = present.stream().max(Comparator.comparingInt(a -> a.value.apply(radar))).orElseThrow();
        if (weakest.value.apply(radar) <= 50) {
            points.add(new KeyPoint("STYLE", "Khai thác điểm yếu " + weakest.label, weakest.whenWeak,
                    weakest.label + " " + weakest.value.apply(radar) + "/100", List.of()));
        }
        if (strongest.value.apply(radar) >= 80 && strongest != weakest) {
            points.add(new KeyPoint("STYLE", "Vô hiệu hoá " + strongest.label, strongest.whenStrong,
                    strongest.label + " " + strongest.value.apply(radar) + "/100", List.of()));
        }
        return points;
    }

    private static HeadToHead headToHead(PlayerProfileResponse opp, String ownName) {
        String key = ownName.trim().toLowerCase(Locale.ROOT);
        List<HeadToHeadMatch> list = opp.matches().stream()
                .filter(m -> m.opponent().trim().toLowerCase(Locale.ROOT).equals(key))
                .map(m -> new HeadToHeadMatch(m.matchId(), m.matchDate(), "PUBLISHED".equals(m.status()),
                        m.ralliesLost(), m.ralliesWon()))
                .toList();
        return new HeadToHead(list.size(),
                list.stream().mapToInt(HeadToHeadMatch::ownWon).sum(),
                list.stream().mapToInt(HeadToHeadMatch::ownLost).sum(),
                list);
    }

    private static DataQuality quality(int analyzed, int decided) {
        if (analyzed >= 3 && decided >= 60) {
            return new DataQuality(analyzed, decided, "HIGH", "Đủ dữ liệu để tin cậy các xu hướng chính.");
        }
        if (decided >= 20) {
            return new DataQuality(analyzed, decided, "MEDIUM",
                    "Dữ liệu vừa đủ; nên kiểm chứng các nhận định bằng video minh chứng.");
        }
        return new DataQuality(analyzed, decided, "LOW",
                "Ít dữ liệu: các nhận định chỉ mang tính tham khảo. Phân tích thêm trận của đối thủ để chính xác hơn.");
    }

    /* ------------------------------------------------------------------ helpers */

    private static Subject subject(PlayerProfileResponse p) {
        return new Subject(p.name(), p.matchCount(), p.analyzedMatchCount(), p.totals().ralliesWon(),
                p.totals().ralliesLost(), p.playstyles().isEmpty() ? null : p.playstyles().get(0).label(), p.radar());
    }

    private static RallyLengthStat bucket(List<RallyLengthStat> buckets, String name) {
        return buckets.stream().filter(b -> name.equals(b.bucket())).findFirst().orElse(new RallyLengthStat(name, 0, 0));
    }

    private record Zone(String name, int count) {
    }

    /** The 3 x 3 zone (per half) holding most of the cells' weight. */
    private static Optional<Zone> topZone(List<ZoneCell> cells) {
        Map<String, Integer> byName = new LinkedHashMap<>();
        for (ZoneCell c : cells) {
            byName.merge(zoneName(c.along(), c.across()), c.count(), Integer::sum);
        }
        return byName.entrySet().stream().max(Map.Entry.comparingByValue())
                .map(e -> new Zone(e.getKey(), e.getValue()));
    }

    /** Same naming as the frontend: depth from the net, then side as the cell's owner faces the net. */
    static String zoneName(int along, int across) {
        double a = (along + 0.5) / 12;
        double depth = Math.abs(a - 0.5) * 2;
        String depthName = depth < 1.0 / 3 ? "gần lưới" : depth < 2.0 / 3 ? "giữa sân" : "cuối sân";
        double c = (across + 0.5) / 6;
        String sideName = c < 1.0 / 3 ? "cánh trái" : c > 2.0 / 3 ? "cánh phải" : "giữa";
        return depthName + ", " + sideName;
    }

    private static Optional<String> zoneOf(RallyEnd e) {
        if (e.x() == null || e.y() == null) {
            return Optional.empty();
        }
        int along = (int) Math.min(11, Math.max(0, Math.floor(e.y() * 12)));
        int across = (int) Math.min(5, Math.max(0, Math.floor(e.x() * 6)));
        return Optional.of(zoneName(along, across));
    }

    /** Opponent's view to the reader's: the court turned half a turn. */
    private static ZoneCell mirror(ZoneCell c) {
        return new ZoneCell(11 - c.along(), 5 - c.across(), c.count());
    }

    private static List<Clip> clips(List<RallyEnd> ends, Predicate<RallyEnd> filter) {
        return ends.stream().filter(filter).limit(MAX_CLIPS)
                .map(e -> new Clip(e.matchId(), e.published(),
                        Math.max(e.rallyStart(), e.seconds() - CLIP_LEAD_SECONDS),
                        "gặp " + e.opponent() + " · " + clock(e.seconds())))
                .toList();
    }

    private static String clock(double seconds) {
        int s = (int) Math.floor(seconds);
        return String.format("%02d:%02d", s / 60, s % 60);
    }

    private static String stroke(String code) {
        return STROKES.getOrDefault(code, code.toLowerCase(Locale.ROOT).replace('_', ' '));
    }

    private static int pct(int part, int whole) {
        return whole == 0 ? 0 : (int) Math.round(100.0 * part / whole);
    }
}
