// The YouTube IFrame Player API, loaded once, for the clip rails and the
// playback check. Browser only: call from effects and handlers.

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onError?: (e: { data: number; target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      };
    }
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** The privacy enhanced host: nothing is set until a clip plays. */
export const YT_HOST = 'https://www.youtube-nocookie.com';

/**
 * Codes that mean this clip will never play here: 2 bad id, 5 HTML5 error,
 * 100 removed or private, 101 and 150 the owner blocks embedding, 152 and 153
 * the embed is refused on this site (the NFL's case).
 */
export const FATAL_ERRORS = new Set([2, 5, 100, 101, 150, 152, 153]);

export const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

let loading: Promise<YTNamespace> | null = null;

export function loadYouTube(): Promise<YTNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) {
    loading = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return loading;
}

/** Player settings for a muted, inline, chrome free autoplay. */
export const autoplayVars = (origin: string) => ({
  autoplay: 1,
  mute: 1,
  playsinline: 1,
  controls: 0,
  rel: 0,
  iv_load_policy: 3,
  disablekb: 1,
  fs: 0,
  origin,
});
