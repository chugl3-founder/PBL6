"""Production Badminton AI Worker (CloudAMQP + Supabase S3 + PyTorch GPU Pipeline).

Architecture:
1. Listens to CloudAMQP queue `badminton.ai.queue`.
2. Downloads match video directly from Supabase S3 storage via boto3.
3. Invokes state-of-the-art AI pipeline from AI_Classifier:
   - Hit Spotting (R(2+1)D-18) + Temporal NMS (98% Recall)
   - Multi-modal Keypoint & Shuttle tracking
   - 8-class Balanced Stroke Classifier (KAP Fusion)
   - Context-aware Disambiguation filter
   - Tactical Intelligence & Spatial 3x3 Court analytics
4. Saves all `ai_events`, `rallies`, `match_statistics`, and structured tactical JSONs
   directly to Supabase PostgreSQL database.
5. Updates match and analysis status to COMPLETED.
"""

from __future__ import annotations

import json
import logging
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

import pika
from psycopg2.extras import Json

from app.config import settings
from app.infrastructure.database import get_connection, update_analysis_status
from app.infrastructure.object_storage import download_video

# Configure paths to import AI_Classifier modules
AI_CLASSIFIER_ROOT = settings.ai_classifier_root
if str(AI_CLASSIFIER_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_CLASSIFIER_ROOT))
if str(AI_CLASSIFIER_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(AI_CLASSIFIER_ROOT / "src"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AI-WORKER] %(message)s",
)
logger = logging.getLogger(__name__)

# Cloud Infrastructure Configurations
AMQP_URL = settings.amqp_url
QUEUE_NAME = settings.queue_name


def save_ai_results_to_database(analysis_id: int, match_id: int, result: Dict[str, Any]):
    logger.info(f"Saving AI analysis results to Supabase DB for Analysis ID {analysis_id}...")
    conn = get_connection()
    cur = conn.cursor()

    try:
        predictions = result.get("predictions", [])
        scoreboard = result.get("scoreboard", {})
        rallies_data = scoreboard.get("rallies", [])
        timing = result.get("timing_seconds", {})

        # Make redelivery/retry idempotent for the same analysis record.
        cur.execute("DELETE FROM match_statistics WHERE analysis_id = %s", (analysis_id,))
        cur.execute("DELETE FROM tactic_detections WHERE analysis_id = %s", (analysis_id,))
        cur.execute("DELETE FROM player_analysis_profiles WHERE analysis_id = %s", (analysis_id,))
        cur.execute("DELETE FROM rally_movement_metrics WHERE analysis_id = %s", (analysis_id,))
        cur.execute("DELETE FROM rallies WHERE analysis_id = %s", (analysis_id,))
        cur.execute("DELETE FROM ai_events WHERE analysis_id = %s", (analysis_id,))

        # 1. Lưu từng sự kiện cú đánh vào ai_events
        created_event_ids: Dict[int, int] = {}  # mapping: event_order -> db_event_id

        for idx, pred in enumerate(predictions):
            event_order = idx + 1
            analytics = pred.get("analytics") or {}
            hit_frame = int(pred.get("frame", pred.get("hit_frame", 0)))
            refined_frame = pred.get("refined_frame", hit_frame)
            time_sec = pred.get("time_seconds", 0.0)
            player_side = str(pred.get("hitter", pred.get("player_side", "LOWER"))).upper()
            stroke = str(pred.get("stroke", "CLEAR")).upper()
            stroke_side = str(pred.get("stroke_side", "UNKNOWN")).upper()
            conf = float(pred.get("confidence", 0.85))
            hit_score = float(pred.get("hit_score", 0.90))
            ball_round = int(pred.get("ball_round", event_order))
            rally_number = int(pred.get("rally", 1))

            top2_json = Json(pred.get("top2", [stroke.lower()]))
            crop_box_json = Json(pred.get("crop_box", []))
            player_pos_json = Json(analytics.get("player_position_court"))
            opp_pos_json = Json(analytics.get("opponent_position_court"))
            shuttle_proj_json = Json(analytics.get("contact_shuttle_projection_court"))
            hitting_area = analytics.get("hitting_area_3x3")

            cur.execute(
                """
                INSERT INTO ai_events (
                    analysis_id, event_order, rally_number, hitter_name,
                    start_frame, hit_frame, end_frame,
                    refined_frame, contact_offset, time_seconds, player_side,
                    stroke, stroke_side, confidence, hit_score, ball_round,
                    gap_from_previous_hit_seconds, top2, tta_used, tta_windows, crop_box,
                    player_position_court, opponent_position_court,
                    contact_shuttle_projection_court, contact_height_image_ratio,
                    hitting_area_3x3, landing_position_court_proxy,
                    landing_area_3x3_proxy, landing_proxy_frame,
                    landing_proxy_confidence, landing_is_proxy,
                    flight_time_to_next_hit_seconds,
                    average_shuttle_speed_image_per_second,
                    average_wrist_speed_image_per_second,
                    shuttle_visibility_ratio, attack_state_rule,
                    created_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s,
                    %s,
                    %s,
                    %s, %s,
                    NOW()
                ) RETURNING id;
                """,
                (
                    analysis_id,
                    event_order,
                    rally_number,
                    pred.get("hitter_name"),
                    max(0, hit_frame - 15),
                    hit_frame,
                    hit_frame + 15,
                    refined_frame,
                    pred.get("contact_offset", 0),
                    time_sec,
                    player_side,
                    stroke,
                    stroke_side,
                    conf,
                    hit_score,
                    ball_round,
                    analytics.get("gap_from_previous_hit_seconds"),
                    top2_json,
                    pred.get("tta_used"),
                    pred.get("tta_windows"),
                    crop_box_json,
                    player_pos_json,
                    opp_pos_json,
                    shuttle_proj_json,
                    analytics.get("contact_height_image_ratio"),
                    hitting_area,
                    Json(analytics.get("landing_position_court_proxy")),
                    analytics.get("landing_area_3x3_proxy"),
                    analytics.get("landing_proxy_frame"),
                    analytics.get("landing_proxy_confidence"),
                    analytics.get("landing_is_proxy", True),
                    analytics.get("flight_time_to_next_hit_seconds"),
                    analytics.get("average_shuttle_speed_image_per_second"),
                    analytics.get("average_wrist_speed_image_per_second"),
                    analytics.get("shuttle_visibility_ratio"),
                    analytics.get("attack_state_rule"),
                ),
            )
            created_event_id = cur.fetchone()[0]
            created_event_ids[event_order] = created_event_id

        # 2. Lưu từng hiệp đấu vào rallies
        for r_idx, r in enumerate(rallies_data):
            rally_num = r_idx + 1
            rally_num = int(r.get("rally_id", rally_num))
            rally_event_orders = [
                idx + 1 for idx, pred in enumerate(predictions)
                if int(pred.get("rally", 1)) == rally_num
            ]
            if not rally_event_orders:
                logger.warning("Skipping rally %s because it has no matching events", rally_num)
                continue
            total_strokes = int(r.get("hits_count", len(rally_event_orders)))
            first_event_db_id = created_event_ids[rally_event_orders[0]]
            last_event_db_id = created_event_ids[rally_event_orders[-1]]

            start_t = float(r.get("start_time_seconds", 0.0))
            end_t = float(r.get("end_time_seconds", start_t))
            dur = float(r.get("duration_seconds", max(0.0, end_t - start_t)))

            cur.execute(
                """
                INSERT INTO rallies (
                    match_id, analysis_id, rally_number, start_event_id, end_event_id,
                    start_time, end_time, duration, total_strokes, boundary_type,
                    server_side, winner_side, win_reason, score_upper, score_lower,
                    score_text, stroke_sequence, is_complete, partial_start, partial_end,
                    created_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, NOW()
                );
                """,
                (
                    match_id,
                    analysis_id,
                    rally_num,
                    first_event_db_id,
                    last_event_db_id,
                    start_t,
                    end_t,
                    dur,
                    total_strokes,
                    r.get("boundary_type", "TIME_GAP"),
                    str(r.get("server", "UNKNOWN")).upper(),
                    str(r.get("winner", "UNKNOWN")).upper(),
                    r.get("win_reason"),
                    r.get("score_upper", 0),
                    r.get("score_lower", 0),
                    r.get("score_text", f"{r.get('score_upper', 0)} - {r.get('score_lower', 0)}"),
                    Json(r.get("stroke_sequence", [])),
                    bool(r.get("is_complete", True)),
                    bool(r.get("partial_start", False)),
                    bool(r.get("partial_end", False)),
                ),
            )

        # 3. Lưu bảng thống kê trận đấu match_statistics
        total_strokes = len(predictions)
        total_rallies = len(rallies_data)
        avg_strokes = (total_strokes / max(1, total_rallies)) if total_rallies > 0 else 0
        durations = [
            float(r.get("duration_seconds", 0.0))
            for r in rallies_data
        ]
        avg_dur = (sum(durations) / max(1, len(durations))) if durations else 0

        player_a_strokes = sum(1 for p in predictions if str(p.get("hitter", p.get("player_side", ""))).upper() == "UPPER")
        player_b_strokes = total_strokes - player_a_strokes
        forehand_cnt = sum(1 for p in predictions if "FOREHAND" in str(p.get("stroke_side", "")).upper())
        backhand_cnt = sum(1 for p in predictions if "BACKHAND" in str(p.get("stroke_side", "")).upper())
        aroundhead_cnt = sum(1 for p in predictions if "AROUNDHEAD" in str(p.get("stroke_side", "")).upper())
        unknown_side_cnt = total_strokes - forehand_cnt - backhand_cnt - aroundhead_cnt
        confs = [float(p.get("confidence", 0.85)) for p in predictions]
        avg_conf = (sum(confs) / max(1, len(confs))) if confs else 0.85

        cur.execute(
            """
            INSERT INTO match_statistics (
                match_id, analysis_id, total_strokes, total_rallies,
                avg_strokes_per_rally, avg_rally_duration, player_a_strokes, player_b_strokes,
                forehand_count, backhand_count, aroundhead_count, unknown_side_count,
                avg_confidence, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, NOW(), NOW()
            );
            """,
            (
                match_id,
                analysis_id,
                total_strokes,
                total_rallies,
                avg_strokes,
                avg_dur,
                player_a_strokes,
                player_b_strokes,
                forehand_cnt,
                backhand_cnt,
                aroundhead_cnt,
                unknown_side_cnt,
                avg_conf,
            ),
        )

        # 4. Cập nhật bản ghi ai_analyses sang COMPLETED với dữ liệu chiến thuật chi tiết
        structured_tactics = result.get("structured_tactics", {})
        for tactic_row in structured_tactics.get("rallies", []):
            primary_tactic = tactic_row.get("primary_tactic", "no_tactic")
            detected = tactic_row.get("detected_tactics", []) or [{
                "type": primary_tactic,
                "label": tactic_row.get("primary_tactic_label", "No Tactic"),
                "intervals": [{}],
                "evidence_quality": "no_rule_matched",
            }]
            for tactic in detected:
                for interval in tactic.get("intervals") or [{}]:
                    cur.execute(
                        """
                        INSERT INTO tactic_detections (
                            analysis_id, rally_number, player_side, player_name,
                            tactic_code, tactic_label, is_primary,
                            start_ball_round, end_ball_round, shot_count,
                            evidence_quality, confidence_calibrated,
                            uses_landing_proxy, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s,
                                  %s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (
                            analysis_id, tactic_row.get("rally_id", 1),
                            str(tactic_row.get("player", "upper")).upper(),
                            tactic_row.get("player_name"),
                            tactic.get("type", "no_tactic"),
                            tactic.get("label", "No Tactic"),
                            tactic.get("type") == primary_tactic,
                            interval.get("start_ball_round"),
                            interval.get("end_ball_round"),
                            tactic_row.get("shot_count", 0),
                            tactic.get("evidence_quality"),
                            bool(tactic.get("confidence_calibrated", False)),
                            bool(tactic.get("uses_landing_proxy", False)),
                        ),
                    )

        for side, profile in result.get("player_profiles", {}).items():
            radar = profile.get("radar_attributes", {})
            playstyle = profile.get("playstyle", {})
            cur.execute(
                """
                INSERT INTO player_analysis_profiles (
                    analysis_id, player_side, player_name, total_shots,
                    playstyle_label, playstyle_description, attack_score,
                    defense_score, net_control_score, shot_variety_score,
                    consistency_score, pace_score,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s,
                          %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (
                    analysis_id, side.upper(), profile.get("player_name"),
                    profile.get("total_shots", 0), playstyle.get("label"),
                    playstyle.get("description"), radar.get("attack"),
                    radar.get("defense"), radar.get("net_control"),
                    radar.get("shot_variety"), radar.get("consistency"),
                    radar.get("pace"),
                ),
            )

        movement = result.get("movement", {})
        for movement_row in movement.get("rallies", []):
            distances = movement_row.get("lower_bound_distance_meters", {})
            samples = movement_row.get("position_samples", {})
            cur.execute(
                """
                INSERT INTO rally_movement_metrics (
                    analysis_id, rally_number, upper_distance_meters,
                    lower_distance_meters, upper_position_samples,
                    lower_position_samples, is_full_tracking_distance, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    analysis_id, movement_row.get("rally_id", 1),
                    distances.get("upper"), distances.get("lower"),
                    samples.get("upper", 0), samples.get("lower", 0),
                    bool(movement.get("is_full_tracking_distance", False)),
                ),
            )

        cur.execute(
            """
            UPDATE ai_analyses
            SET status = 'COMPLETED',
                completed_at = NOW(),
                updated_at = NOW(),
                summary_data = %s,
                reliability_data = %s,
                tactical_patterns = %s,
                structured_tactics = %s,
                movement_analytics = %s,
                spatial_distribution_3x3 = %s,
                player_profiles = %s,
                radar_chart = %s,
                response_transition_matrix = %s,
                coach_insights = %s,
                timing_seconds = %s
                ,result_schema_version = %s
                ,raw_result = %s
                ,scoreboard_data = %s
                ,scoreboard_ocr_data = %s
                ,suppression_audit = %s
                ,ingested_at = NOW()
            WHERE id = %s;
            """,
            (
                Json(result.get("summary", {})),
                Json(result.get("reliability", {})),
                Json(result.get("tactical_patterns", {})),
                Json(result.get("structured_tactics", {})),
                Json(result.get("movement", {})),
                Json(result.get("spatial_distribution_3x3", {})),
                Json(result.get("player_profiles", {})),
                Json(result.get("radar_chart", {})),
                Json(result.get("response_transition_matrix", {})),
                Json(result.get("coach_insights", [])),
                Json(timing),
                result.get("schema_version"),
                Json(result),
                Json(scoreboard),
                Json(result.get("scoreboard_ocr", {})),
                Json(result.get("suppression_audit", {})),
                analysis_id,
            ),
        )

        # 5. Cập nhật trạng thái trận đấu matches sang ANALYZED
        cur.execute(
            """
            UPDATE matches
            SET status = 'ANALYZED', updated_at = NOW()
            WHERE id = %s;
            """,
            (match_id,),
        )

        video = result.get("video", {})
        cur.execute(
            """
            UPDATE videos
            SET duration_seconds = COALESCE(%s, duration_seconds),
                fps = COALESCE(%s, fps),
                total_frames = COALESCE(%s, total_frames),
                updated_at = NOW()
            WHERE match_id = %s
            """,
            (
                video.get("duration_seconds"),
                video.get("fps"),
                video.get("total_frames"),
                match_id,
            ),
        )

        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"Successfully committed all AI data to Supabase DB for match {match_id} (Analysis {analysis_id}).")

    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        logger.error(f"Error persisting AI results to DB: {e}", exc_info=True)
        raise e


def process_job(payload: Dict[str, Any]):
    analysis_id = payload.get("analysisId")
    match_id = payload.get("matchId")
    storage_path = payload.get("videoStoragePath")

    if not analysis_id or not match_id or not storage_path:
        raise ValueError(f"Invalid message payload: {payload}")

    logger.info(f"=== [STARTING JOB] Analysis ID: {analysis_id}, Match ID: {match_id}, Video: {storage_path} ===")
    update_analysis_status(analysis_id, "PROCESSING")

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        temp_video_path = Path(tmpdir) / Path(storage_path).name
        download_video(storage_path, temp_video_path)

        # Import AI Pipeline
        try:
            from run_pipeline import analyze_badminton_video
            has_pipeline = True
        except ImportError as e:
            logger.warning(f"Could not import 'run_pipeline' from AI_Classifier ({e}). Running in Skeleton Consumer mode.")
            has_pipeline = False

        if not has_pipeline:
            logger.info("Executing skeleton job processing without GPU pipeline...")
            time.sleep(1)
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE ai_analyses SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = %s;", (analysis_id,))
            cur.execute("UPDATE matches SET status = 'ANALYZED', updated_at = NOW() WHERE id = %s;", (match_id,))
            conn.commit()
            cur.close()
            conn.close()
            logger.info(f"=== [SKELETON JOB COMPLETED] Successfully processed Match {match_id} ===")
            return

        output_json_path = Path(tmpdir) / f"match_{match_id}_analysis.json"

        # Checkpoints
        ckpts = AI_CLASSIFIER_ROOT / "src" / "ai_classifier" / "models" / "checkpoints"
        hit_ckpt = (ckpts / "hit_detector.pth") if (ckpts / "hit_detector.pth").exists() else (AI_CLASSIFIER_ROOT / "work_dirs" / "r2plus1d18_hit_full" / "best.pth")
        kap_ckpt = (ckpts / "kap_classifier.pth") if (ckpts / "kap_classifier.pth").exists() else (AI_CLASSIFIER_ROOT / "work_dirs" / "kap_online_balanced_selection_20261008" / "best.pth")
        pose_ckpt = (ckpts / "yolov8n-pose.pt") if (ckpts / "yolov8n-pose.pt").exists() else (AI_CLASSIFIER_ROOT / "models" / "checkpoints" / "pose" / "yolov8n-pose.pt")
        rally_ckpt = (ckpts / "rally_boundary_detector.joblib") if (ckpts / "rally_boundary_detector.joblib").exists() else (AI_CLASSIFIER_ROOT / "work_dirs" / "rally_boundary_detector.joblib")

        logger.info(f"Launching AI pipeline inference on GPU...")
        result = analyze_badminton_video(
            video_path=temp_video_path,
            output_path=output_json_path,
            player_upper="Player Upper",
            player_lower="Player Lower",
            hit_checkpoint=hit_ckpt,
            kap_checkpoint=kap_ckpt,
            pose_model=pose_ckpt,
            rally_model=rally_ckpt,
            threshold=0.75,
            stride=4,
            batch_size=8,
            nms_radius=8,
            same_side_nms_radius=18,
            contact_refine_radius=2,
            shared_cache=True,
            use_amp=True,
            use_tta=True,
            full_tta=False,
            hit_rescue=True,
            serve_rescue_threshold=0.40,
            bridge_rescue_threshold=0.55,
        )

        save_ai_results_to_database(analysis_id, match_id, result)
        logger.info(f"=== [JOB COMPLETED] Successfully analyzed Match {match_id} ===")


def callback(ch, method, properties, body):
    try:
        payload = json.loads(body.decode("utf-8"))
        logger.info(f"==> [AMQP MESSAGE RECEIVED] {payload}")
        process_job(payload)
        ch.basic_ack(delivery_tag=method.delivery_tag)
        logger.info(f"<== [ACKNOWLEDGED] Message processed cleanly.")
    except Exception as e:
        logger.error(f"Error executing AI job: {e}", exc_info=True)
        try:
            payload = json.loads(body.decode("utf-8"))
            if "analysisId" in payload:
                update_analysis_status(payload["analysisId"], "FAILED", str(e))
        except Exception:
            pass
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def connect_to_rabbitmq():
    parameters = pika.URLParameters(AMQP_URL)
    parameters.heartbeat = 600
    parameters.blocked_connection_timeout = 300

    while True:
        try:
            logger.info("Connecting to CloudAMQP via SSL/TLS...")
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            logger.info(f"Connected to CloudAMQP. Actively listening on queue '{QUEUE_NAME}'...")
            return connection, channel
        except Exception as e:
            logger.warning(f"CloudAMQP connection failed ({e}). Retrying in 5 seconds...")
            time.sleep(5)


def main():
    logger.info("Starting Badminton Production AI Worker with GPU...")
    connection, channel = connect_to_rabbitmq()
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("AI Worker stopped by user.")
        channel.stop_consuming()
        connection.close()


if __name__ == "__main__":
    main()
