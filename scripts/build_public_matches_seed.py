import csv
import json
import re
from pathlib import Path
from collections import defaultdict

AI_DATA_DIR = Path(r"D:\DUT\HK1_Nam4_2026-2027\PBL6\Badminton_AI\data\manifests")
OUTPUT_PATH = Path(r"backend\src\main\resources\dataset\public_matches_seed.json")

FEATURED_MATCH_IDS = ["13", "39", "18", "1"]

def extract_youtube_id(url: str) -> str:
    match = re.search(r"v=([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    match_short = re.search(r"youtu\.be/([a-zA-Z0-9_-]+)", url)
    if match_short:
        return match_short.group(1)
    return ""

def map_stroke(coarse: str) -> str:
    mapping = {
        "serve": "SERVE",
        "smash": "SMASH",
        "clear": "CLEAR",
        "drop": "DROP",
        "lift": "LIFT",
        "drive": "DRIVE",
        "net_shot": "NET_SHOT",
        "net_attack": "NET_ATTACK",
        "push": "PUSH"
    }
    return mapping.get(coarse.lower().strip(), "CLEAR")

def map_stroke_side(side: str) -> str:
    s = side.lower().strip()
    if "backhand" in s:
        return "BACKHAND"
    if "aroundhead" in s:
        return "AROUNDHEAD"
    return "FOREHAND"

def main():
    print("Reading matches from shuttleset_video_downloads.csv...")
    matches_info = {}
    with open(AI_DATA_DIR / "shuttleset_video_downloads.csv", mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row["match_id"].strip()
            if mid in FEATURED_MATCH_IDS:
                matches_info[mid] = row

    print("Reading strokes from shuttleset_npy.csv...")
    matches_strokes = defaultdict(list)
    with open(AI_DATA_DIR / "shuttleset_npy.csv", mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row["match_id"].strip()
            if mid in FEATURED_MATCH_IDS:
                matches_strokes[mid].append(row)

    output_matches = []

    for mid in FEATURED_MATCH_IDS:
        minfo = matches_info.get(mid)
        if not minfo:
            continue

        raw_strokes = matches_strokes.get(mid, [])
        # Sắp xếp theo hit_frame
        raw_strokes.sort(key=lambda x: int(x["hit_frame"]))

        # Lấy danh sách rally duy nhất
        rallies_map = defaultdict(list)
        for s in raw_strokes:
            rallies_map[s["rally"]].append(s)

        yt_url = minfo["url"]
        yt_id = extract_youtube_id(yt_url)

        winner = minfo["winner"].title()
        loser = minfo["loser"].title()
        tournament = minfo["tournament"]
        round_name = minfo["round"]
        duration_minutes = float(minfo["duration_minutes"]) if minfo["duration_minutes"] else 45.0

        title = f"{tournament} ({round_name}): {winner} vs {loser}"
        description = f"Trận đấu đỉnh cao thế giới giữa {winner} và {loser} tại {tournament} ({round_name}). Phân tích chi tiết từng cú đánh và pha cầu bằng mô hình AI Computer Vision."

        # Sinh danh sách AiEvent
        events = []
        for idx, s in enumerate(raw_strokes):
            frame = int(s["hit_frame"])
            time_sec = round(frame / 30.0, 2)
            player_side = "UPPER" if s["player_side"].lower() == "top" else "LOWER"
            stroke_type = map_stroke(s["coarse_label"])
            stroke_side = map_stroke_side(s["stroke_side"])
            
            # Tọa độ mô phỏng chuẩn xác trên sân 2D (0..1)
            # Upper: x=0.2..0.8, y=0.12..0.42. Lower: x=0.2..0.8, y=0.58..0.88
            pos_x = round(0.25 + ((idx * 37) % 50) / 100.0, 3)
            pos_y = round(0.15 + ((idx * 23) % 28) / 100.0, 3) if player_side == "UPPER" else round(0.60 + ((idx * 29) % 28) / 100.0, 3)
            
            opp_x = round(0.25 + (((idx + 5) * 31) % 50) / 100.0, 3)
            opp_y = round(0.62 + ((idx * 17) % 26) / 100.0, 3) if player_side == "UPPER" else round(0.18 + ((idx * 19) % 25) / 100.0, 3)

            land_x = round(0.20 + (((idx + 7) * 41) % 60) / 100.0, 3)
            land_y = opp_y

            # Phân vùng 3x3: hàng 1-3
            hit_zone = (1 if pos_y < 0.33 else (2 if pos_y < 0.66 else 3)) * 3 - (0 if pos_x > 0.66 else (1 if pos_x > 0.33 else 2))
            hit_zone = max(1, min(9, hit_zone))

            land_zone = (1 if land_y < 0.33 else (2 if land_y < 0.66 else 3)) * 3 - (0 if land_x > 0.66 else (1 if land_x > 0.33 else 2))
            land_zone = max(1, min(9, land_zone))

            confidence = round(0.82 + ((idx * 13) % 17) / 100.0, 2)
            if idx % 27 == 0:
                confidence = 0.54  # Tạo 1 vài sự kiện độ tin cậy thấp để kiểm thử cảnh báo VS-10

            shuttle_speed = round(120.0 + ((idx * 19) % 180), 1) if stroke_type == "SMASH" else round(45.0 + ((idx * 11) % 55), 1)

            events.append({
                "eventOrder": idx + 1,
                "rallyNumber": int(s["rally"]),
                "ballRound": int(s["ball_round"]),
                "timeSeconds": time_sec,
                "stroke": stroke_type,
                "strokeSide": stroke_side,
                "playerSide": player_side,
                "confidence": confidence,
                "playerPositionCourt": [pos_x, pos_y],
                "opponentPositionCourt": [opp_x, opp_y],
                "contactShuttleProjectionCourt": [pos_x, pos_y],
                "landingPositionCourtProxy": [land_x, land_y],
                "hittingArea3x3": hit_zone,
                "landingArea3x3Proxy": land_zone,
                "averageShuttleSpeed": shuttle_speed,
                "attackStateRule": "ATTACKING" if stroke_type in ["SMASH", "NET_ATTACK"] else "NEUTRAL"
            })

        # Sinh danh sách Rallies
        rallies = []
        rally_keys = sorted(rallies_map.keys(), key=lambda x: int(x))
        score_u = 0
        score_l = 0

        for r_num_str in rally_keys:
            r_strokes = rallies_map[r_num_str]
            r_num = int(r_num_str)
            start_frame = int(r_strokes[0]["hit_frame"])
            end_frame = int(r_strokes[-1]["hit_frame"])
            start_time = round(start_frame / 30.0, 2)
            end_time = round(end_frame / 30.0, 2)
            duration = round(end_time - start_time, 2)
            if duration <= 0:
                duration = 3.5

            winner_side = "UPPER" if (r_num % 2 == 1) else "LOWER"
            if winner_side == "UPPER":
                score_u += 1
            else:
                score_l += 1

            seq = [map_stroke(st["coarse_label"]) for st in r_strokes]
            last_stroke = seq[-1]
            win_reason = "Winner by Smash" if last_stroke == "SMASH" else ("Forced Error" if last_stroke in ["NET_SHOT", "NET_ATTACK"] else "Unforced Error")

            rallies.append({
                "rallyNumber": r_num,
                "startTime": start_time,
                "endTime": end_time,
                "duration": duration,
                "totalStrokes": len(r_strokes),
                "serverSide": "UPPER" if (r_num % 2 == 1) else "LOWER",
                "winnerSide": winner_side,
                "winReason": win_reason,
                "scoreUpper": score_u,
                "scoreLower": score_l,
                "scoreText": f"{score_u} - {score_l}",
                "strokeSequence": seq
            })

        # Sinh thống kê
        total_strokes = len(events)
        total_rallies = len(rallies)
        avg_strokes = round(total_strokes / max(1, total_rallies), 2)
        avg_dur = round(sum(r["duration"] for r in rallies) / max(1, total_rallies), 2)

        stroke_dist = defaultdict(int)
        player_a_strokes = 0
        player_b_strokes = 0
        forehand_c = 0
        backhand_c = 0

        for e in events:
            stroke_dist[e["stroke"]] += 1
            if e["playerSide"] == "UPPER":
                player_a_strokes += 1
            else:
                player_b_strokes += 1
            if e["strokeSide"] == "FOREHAND":
                forehand_c += 1
            else:
                backhand_c += 1

        match_data = {
            "sourceDatasetId": mid,
            "title": title,
            "description": description,
            "playerAName": winner,
            "playerBName": loser,
            "upperPlayer": "PLAYER_A",
            "lowerPlayer": "PLAYER_B",
            "matchDate": "2020-01-12",
            "source": "ADMIN_CURATED",
            "status": "PUBLISHED",
            "video": {
                "fileName": f"{winner}_{loser}_{tournament}.mp4",
                "storagePath": f"youtube/{yt_id}",
                "videoSourceType": "YOUTUBE",
                "youtubeUrl": yt_url,
                "youtubeVideoId": yt_id,
                "durationSeconds": duration_minutes * 60.0,
                "status": "READY"
            },
            "statistics": {
                "totalStrokes": total_strokes,
                "totalRallies": total_rallies,
                "avgStrokesPerRally": avg_strokes,
                "avgRallyDuration": avg_dur,
                "playerAStrokes": player_a_strokes,
                "playerBStrokes": player_b_strokes,
                "forehandCount": forehand_c,
                "backhandCount": backhand_c,
                "strokeDistribution": dict(stroke_dist)
            },
            "rallies": rallies,
            "events": events
        }

        output_matches.append(match_data)
        print(f"Generated match {mid}: {title} with {len(events)} events and {len(rallies)} rallies.")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, mode="w", encoding="utf-8") as out:
        json.dump(output_matches, out, ensure_ascii=False, indent=2)

    print(f"Successfully saved {len(output_matches)} matches into {OUTPUT_PATH}!")

if __name__ == "__main__":
    main()
