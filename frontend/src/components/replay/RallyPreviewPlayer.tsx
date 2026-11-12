import React, { useEffect, useRef } from 'react';

export interface PreviewClip {
  start: number;
  end: number;
}

interface RallyPreviewPlayerProps {
  /** Presigned MP4 of the match; used when the video is not on YouTube. */
  videoUrl?: string;
  youtubeVideoId?: string;
  clip: PreviewClip | null;
  /** Changes on every request to play, so the same clip can be replayed. */
  playToken: number;
  /** false for the first clip shown when the dialog opens: cue it without playing. */
  autoPlay: boolean;
  onEnded?: () => void;
}

/**
 * Plays one rally of the match inside the highlight dialog, so the owner can judge a rally before ticking it.
 * MP4: a <video> seeks and stops at the clip end. YouTube: one IFrame API player (already loaded by the replay
 * page) is cued to each clip with startSeconds/endSeconds and reports the end itself.
 */
export const RallyPreviewPlayer: React.FC<RallyPreviewPlayerProps> = props => {
  if (!props.clip) return <div className="aspect-video rounded-md bg-ink" />;
  return props.youtubeVideoId
    ? <YouTubeClipPlayer {...props} youtubeVideoId={props.youtubeVideoId} clip={props.clip} />
    : <Mp4ClipPlayer {...props} clip={props.clip} />;
};

type ClipProps = RallyPreviewPlayerProps & { clip: PreviewClip };

const Mp4ClipPlayer: React.FC<ClipProps> = ({ videoUrl, clip, playToken, autoPlay, onEnded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const seek = () => {
      v.currentTime = clip.start;
      if (autoPlay) v.play().catch(() => undefined);
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener('loadedmetadata', seek, { once: true });
    return () => v.removeEventListener('loadedmetadata', seek);
  }, [clip.start, clip.end, playToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || v.paused) return;
    if (v.currentTime >= clip.end) {
      v.pause();
      endedRef.current?.();
    }
  };

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      preload="metadata"
      playsInline
      onTimeUpdate={handleTimeUpdate}
      className="w-full aspect-video rounded-md bg-ink"
    />
  );
};

const YT_ENDED = 0;

const YouTubeClipPlayer: React.FC<ClipProps & { youtubeVideoId: string }> = ({
  youtubeVideoId,
  clip,
  playToken,
  autoPlay,
  onEnded,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const clipRef = useRef({ clip, autoPlay });
  clipRef.current = { clip, autoPlay };

  const cue = () => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    const { clip: c, autoPlay: play } = clipRef.current;
    const args = { videoId: youtubeVideoId, startSeconds: c.start, endSeconds: c.end };
    if (play) player.loadVideoById(args);
    else player.cueVideoById(args);
  };

  // One player for the life of the dialog; the script is loaded by the replay page.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const create = () => {
      const YT = (window as any).YT;
      if (!YT?.Player || !hostRef.current) {
        timer = window.setTimeout(create, 100);
        return;
      }
      const target = document.createElement('div');
      hostRef.current.appendChild(target);
      playerRef.current = new YT.Player(target, {
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            if (cancelled) return;
            readyRef.current = true;
            cue();
          },
          onStateChange: (e: any) => {
            if (!cancelled && e.data === YT_ENDED) endedRef.current?.();
          },
        },
      });
    };
    create();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      try {
        playerRef.current?.destroy();
      } catch {
        // Already gone with the dialog.
      }
      playerRef.current = null;
      readyRef.current = false;
    };
  }, [youtubeVideoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(cue, [clip.start, clip.end, playToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={hostRef} className="w-full aspect-video rounded-md bg-ink overflow-hidden [&>iframe]:w-full [&>iframe]:h-full" />;
};
