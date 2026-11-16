"""Cuts rallies out of a match video and joins them into one highlight MP4 with ffmpeg.

Each clip is encoded on its own with the same settings (1280x720, 30 fps, H.264 + AAC 48 kHz stereo), so the
final join is a stream copy. Overlay text goes through textfile= and the fonts are copied next to it: no
filtergraph escaping of names with colons, quotes or Vietnamese characters, and no Windows drive letters in
the filter string.

Run on its own to try a cut without the broker:
    python render.py --input match.mp4 --clips clips.json --out reel.mp4 --title "Highlight"
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

WIDTH, HEIGHT, FPS = 1280, 720, 30
INTRO_SECONDS = 3.0
LABEL_SECONDS = 3.5
FADE_SECONDS = 0.25
AUDIO_KBPS = 128
# Supabase Storage rejects files over 50 MB; keep a margin for the container overhead.
TARGET_BYTES = int(os.getenv("HIGHLIGHT_TARGET_BYTES", str(40 * 1024 * 1024)))
MAX_VIDEO_KBPS = 2800
MIN_VIDEO_KBPS = 700

BACKGROUND = "0x16201b"
ACCENT = "0x2f9e6b"

_FONT_CANDIDATES = {
    "regular": [
        os.getenv("HIGHLIGHT_FONT", ""),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ],
    "bold": [
        os.getenv("HIGHLIGHT_FONT_BOLD", ""),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ],
}


@dataclass
class Clip:
    start: float
    end: float
    label: str
    score_a: int
    score_b: int
    rally_number: int = 0
    game: int = 0

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)

    @classmethod
    def from_json(cls, data: Dict) -> "Clip":
        return cls(
            start=float(data["start"]),
            end=float(data["end"]),
            label=str(data.get("label") or ""),
            # Per player since the backend splits games; scoreUpper/scoreLower are the older per-side keys.
            score_a=int(data.get("scoreA", data.get("scoreUpper", 0))),
            score_b=int(data.get("scoreB", data.get("scoreLower", 0))),
            rally_number=int(data.get("rallyNumber", 0)),
            game=int(data.get("game", 0)),
        )


@dataclass
class Source:
    """Where the match video is read from: a local path or an HTTP URL, plus an optional separate audio stream."""

    video: str
    audio: Optional[str] = None
    http_headers: Dict[str, str] = field(default_factory=dict)

    def input_args(self, url: str, start: float, duration: float) -> List[str]:
        args: List[str] = []
        if url.startswith("http"):
            if self.http_headers:
                headers = "".join(f"{k}: {v}\r\n" for k, v in self.http_headers.items())
                args += ["-headers", headers]
            # Remote reads drop now and then on long matches; let ffmpeg reconnect instead of failing the reel.
            args += ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"]
        return args + ["-ss", f"{start:.3f}", "-t", f"{duration:.3f}", "-i", url]


class RenderError(RuntimeError):
    """A failure whose message can be shown to the user."""


def ffmpeg_binary(name: str = "ffmpeg") -> str:
    path = shutil.which(name)
    if not path:
        raise RenderError(f"Máy dựng video chưa cài {name}. Hãy cài ffmpeg và thêm vào PATH.")
    return path


def _run(args: List[str], cwd: Path) -> None:
    logger.debug("ffmpeg %s", " ".join(args))
    proc = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        logger.error("ffmpeg failed (%s):\n%s", proc.returncode, tail)
        raise RuntimeError(f"ffmpeg exited with {proc.returncode}: {tail[-500:]}")


def has_audio(url: str, source: Source) -> bool:
    args = [ffmpeg_binary("ffprobe"), "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
            "-of", "csv=p=0"]
    if url.startswith("http") and source.http_headers:
        args += ["-headers", "".join(f"{k}: {v}\r\n" for k, v in source.http_headers.items())]
    proc = subprocess.run(args + [url], capture_output=True, text=True, timeout=120)
    return proc.returncode == 0 and proc.stdout.strip() != ""


def _copy_fonts(workdir: Path) -> Dict[str, str]:
    """Copies one regular and one bold font into workdir and returns their file names."""
    names = {}
    for weight, candidates in _FONT_CANDIDATES.items():
        found = next((Path(c) for c in candidates if c and Path(c).is_file()), None)
        if found is None:
            raise RenderError("Không tìm thấy font chữ cho video. Hãy đặt biến HIGHLIGHT_FONT trỏ tới file .ttf.")
        target = workdir / f"font-{weight}{found.suffix.lower()}"
        shutil.copyfile(found, target)
        names[weight] = target.name
    return names


def _text_file(workdir: Path, name: str, text: str) -> str:
    # drawtext expands % sequences in text files too.
    (workdir / name).write_text(text.replace("%", "%%"), encoding="utf-8")
    return name


def _fit(text: str, limit: int) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def video_kbps(total_seconds: float) -> int:
    """The bitrate that keeps the whole reel under TARGET_BYTES."""
    budget = TARGET_BYTES * 8 / 1000 / max(total_seconds, 1.0) - AUDIO_KBPS
    return int(max(MIN_VIDEO_KBPS, min(MAX_VIDEO_KBPS, budget)))


def _encode_args(kbps: int) -> List[str]:
    return [
        "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.3)}k", "-bufsize", f"{kbps * 2}k",
        "-r", str(FPS), "-g", str(FPS * 2),
        "-c:a", "aac", "-b:a", f"{AUDIO_KBPS}k", "-ar", "48000", "-ac", "2",
        "-video_track_timescale", "15360",
    ]


def _render_intro(workdir: Path, fonts: Dict[str, str], title: str, subtitle: str, kbps: int, out: Path) -> None:
    title_file = _text_file(workdir, "intro-title.txt", _fit(title, 42))
    sub_file = _text_file(workdir, "intro-sub.txt", _fit(subtitle, 70))
    brand_file = _text_file(workdir, "intro-brand.txt", "HIGHLIGHT TỰ ĐỘNG · AI BADMINTON")
    fade_out = INTRO_SECONDS - 0.4
    vf = (
        f"drawbox=x=(w-120)/2:y=h/2-92:w=120:h=4:color={ACCENT}:t=fill,"
        f"drawtext=fontfile={fonts['regular']}:textfile={brand_file}:fontsize=20:fontcolor=white@0.6:"
        f"x=(w-tw)/2:y=h/2-140,"
        f"drawtext=fontfile={fonts['bold']}:textfile={title_file}:fontsize=54:fontcolor=white:"
        f"x=(w-tw)/2:y=h/2-60,"
        f"drawtext=fontfile={fonts['regular']}:textfile={sub_file}:fontsize=28:fontcolor=white@0.75:"
        f"x=(w-tw)/2:y=h/2+24,"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out:.2f}:d=0.4"
    )
    _run([
        ffmpeg_binary(), "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-t", f"{INTRO_SECONDS}", "-i", f"color=c={BACKGROUND}:s={WIDTH}x{HEIGHT}:r={FPS}",
        "-f", "lavfi", "-t", f"{INTRO_SECONDS}", "-i", "anullsrc=r=48000:cl=stereo",
        "-vf", vf, *_encode_args(kbps), "-shortest", out.name,
    ], cwd=workdir)


def _clip_filter(index: int, clip: Clip, fonts: Dict[str, str], workdir: Path,
                 name_a: str, name_b: str, audio_label: str) -> str:
    up_name = _text_file(workdir, f"c{index}-un.txt", _fit(name_a, 18))
    low_name = _text_file(workdir, f"c{index}-ln.txt", _fit(name_b, 18))
    up_score = _text_file(workdir, f"c{index}-us.txt", str(clip.score_a))
    low_score = _text_file(workdir, f"c{index}-ls.txt", str(clip.score_b))
    game = _text_file(workdir, f"c{index}-game.txt", f"VÁN {clip.game}" if clip.game else "")
    label = _text_file(workdir, f"c{index}-label.txt", _fit(clip.label, 48))

    d = clip.duration
    fade_out = max(0.0, d - FADE_SECONDS)
    # Top right, away from the broadcaster's own scoreboard, which sits at the top or bottom left.
    bx, by, bw, row = WIDTH - 24 - 300, 24, 300, 38
    label_alpha = (
        f"if(lt(t,0.3),t/0.3,if(lt(t,{LABEL_SECONDS - 0.3}),1,max(0,({LABEL_SECONDS}-t)/0.3)))"
    )
    video = (
        f"[0:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
        f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={FPS},"
        f"drawbox=x={bx}:y={by}:w={bw}:h={row * 2}:color={BACKGROUND}@0.85:t=fill,"
        f"drawbox=x={bx}:y={by}:w=4:h={row * 2}:color={ACCENT}:t=fill,"
        f"drawtext=fontfile={fonts['regular']}:textfile={up_name}:fontsize=21:fontcolor=white:"
        f"x={bx + 16}:y={by + (row - 21) // 2 + 1},"
        f"drawtext=fontfile={fonts['regular']}:textfile={low_name}:fontsize=21:fontcolor=white:"
        f"x={bx + 16}:y={by + row + (row - 21) // 2 + 1},"
        f"drawtext=fontfile={fonts['bold']}:textfile={up_score}:fontsize=24:fontcolor=white:"
        f"x={bx + bw - 16}-tw:y={by + (row - 24) // 2 + 1},"
        f"drawtext=fontfile={fonts['bold']}:textfile={low_score}:fontsize=24:fontcolor=white:"
        f"x={bx + bw - 16}-tw:y={by + row + (row - 24) // 2 + 1},"
        f"drawtext=fontfile={fonts['bold']}:textfile={game}:fontsize=14:fontcolor=white:"
        f"box=1:boxcolor={ACCENT}:boxborderw=5:x={bx + bw}-tw-5:y={by + row * 2 + 8},"
        f"drawtext=fontfile={fonts['bold']}:textfile={label}:fontsize=30:fontcolor=white:"
        f"box=1:boxcolor={BACKGROUND}@0.85:boxborderw=16:x=(w-tw)/2:y=h-th-72:alpha='{label_alpha}',"
        f"fade=t=in:st=0:d={FADE_SECONDS},fade=t=out:st={fade_out:.3f}:d={FADE_SECONDS}[v]"
    )
    audio = (
        f"[{audio_label}]aresample=48000,aformat=channel_layouts=stereo,"
        f"afade=t=in:st=0:d={FADE_SECONDS},afade=t=out:st={fade_out:.3f}:d={FADE_SECONDS}[a]"
    )
    return f"{video};{audio}"


def _render_clip(index: int, clip: Clip, source: Source, audio_in_video: bool, fonts: Dict[str, str],
                 workdir: Path, name_a: str, name_b: str, kbps: int, out: Path) -> None:
    args = [ffmpeg_binary(), "-hide_banner", "-loglevel", "error", "-y"]
    args += source.input_args(source.video, clip.start, clip.duration)
    if source.audio:
        args += source.input_args(source.audio, clip.start, clip.duration)
        audio_label = "1:a"
    elif audio_in_video:
        audio_label = "0:a"
    else:
        args += ["-f", "lavfi", "-t", f"{clip.duration:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        audio_label = "1:a"
    graph = _clip_filter(index, clip, fonts, workdir, name_a, name_b, audio_label)
    _run(args + ["-filter_complex", graph, "-map", "[v]", "-map", "[a]", *_encode_args(kbps),
                 "-t", f"{clip.duration:.3f}", out.name], cwd=workdir)


def render_reel(
    source: Source,
    clips: List[Clip],
    out_path: Path,
    workdir: Path,
    title: str,
    subtitle: str = "",
    name_a: str = "A",
    name_b: str = "B",
    on_progress: Callable[[int], None] = lambda _p: None,
) -> float:
    """Renders the reel to out_path and returns its duration in seconds."""
    clips = [c for c in clips if c.duration > 0.5]
    if not clips:
        raise RenderError("Không có pha cầu nào đủ dài để dựng video.")
    workdir.mkdir(parents=True, exist_ok=True)
    fonts = _copy_fonts(workdir)
    total = INTRO_SECONDS + sum(c.duration for c in clips)
    kbps = video_kbps(total)
    logger.info("Rendering %d clips, %.1f s at %d kbps", len(clips), total, kbps)

    audio_in_video = source.audio is None and has_audio(source.video, source)
    parts: List[Path] = [workdir / "part-000-intro.mp4"]
    _render_intro(workdir, fonts, title, subtitle, kbps, parts[0])
    on_progress(5)

    for i, clip in enumerate(clips, start=1):
        part = workdir / f"part-{i:03d}.mp4"
        _render_clip(i, clip, source, audio_in_video, fonts, workdir, name_a, name_b, kbps, part)
        parts.append(part)
        on_progress(5 + int(85 * i / len(clips)))

    (workdir / "parts.txt").write_text("".join(f"file '{p.name}'\n" for p in parts), encoding="utf-8")
    joined = workdir / "reel.mp4"
    _run([ffmpeg_binary(), "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
          "-i", "parts.txt", "-c", "copy", "-movflags", "+faststart", joined.name], cwd=workdir)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(joined), str(out_path))
    on_progress(95)
    return probe_duration(out_path)


def probe_duration(path: Path) -> float:
    proc = subprocess.run([ffmpeg_binary("ffprobe"), "-v", "error", "-show_entries", "format=duration",
                           "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    try:
        return float(proc.stdout.strip())
    except ValueError:
        return 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a highlight reel from a local video.")
    parser.add_argument("--input", required=True, help="Video file or URL")
    parser.add_argument("--clips", required=True, help="JSON file: [{start, end, label, scoreA, scoreB, game}]")
    parser.add_argument("--out", required=True)
    parser.add_argument("--title", default="Highlight")
    parser.add_argument("--subtitle", default="")
    parser.add_argument("--name-a", default="A")
    parser.add_argument("--name-b", default="B")
    parser.add_argument("--workdir", default=None)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    clips = [Clip.from_json(c) for c in json.loads(Path(args.clips).read_text(encoding="utf-8"))]
    workdir = Path(args.workdir) if args.workdir else Path(args.out).with_suffix(".work")
    seconds = render_reel(Source(video=args.input), clips, Path(args.out), workdir, args.title, args.subtitle,
                          args.name_a, args.name_b, on_progress=lambda p: logger.info("progress %d%%", p))
    print(f"{args.out}: {seconds:.1f} s, {Path(args.out).stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
