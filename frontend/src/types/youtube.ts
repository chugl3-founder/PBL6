/** The parts of the YouTube IFrame API player this app uses (https://developers.google.com/youtube/iframe_api_reference). */

export interface YouTubeClipArgs {
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
}

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(args: YouTubeClipArgs): void;
  cueVideoById(args: YouTubeClipArgs): void;
  getCurrentTime(): number;
  getDuration(): number;
  /** -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued. */
  getPlayerState(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

export interface YouTubeApi {
  Player: new (element: HTMLElement | string, options: object) => YouTubePlayer;
}

/** The global the IFrame API script installs, and the callback it calls once loaded. */
export const youTubeGlobal = () =>
  window as unknown as { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
