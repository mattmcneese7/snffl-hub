// Where an ESPN clip's actual video lives.
//
// The reel used to mount ESPN's syndicated player in an iframe, which brings
// its own chrome, its own branding and its own ads into the middle of our app,
// and cannot be styled, autoplayed or swiped. ESPN's clip record carries the
// stream itself: an HLS manifest served with Access-Control-Allow-Origin: *,
// plus progressive MP4 renditions. So the app can play the clip in a plain
// video element with its own controls.
//
// Resolved in the browser when a clip is opened rather than stored, so there
// is no column to migrate and no stale URL: these are signed-looking CDN paths
// that ESPN can move whenever it likes.

export type ClipSource = {
  /** Adaptive stream. Safari plays it directly; everything else needs hls.js. */
  hls: string | null;
  /** A single progressive file, which every browser can play unaided. */
  mp4: string | null;
  poster: string | null;
};

const CLIP = 'https://content.core.api.espn.com/v1/video/clips';

const href = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'href' in value) {
    const inner = (value as { href?: unknown }).href;
    return typeof inner === 'string' ? inner : null;
  }
  return null;
};

export async function clipSource(espnId: string): Promise<ClipSource | null> {
  try {
    const res = await fetch(`${CLIP}/${espnId}`);
    if (!res.ok) return null;
    const json = await res.json();
    const video = (json?.videos ?? [json])[0];
    if (!video) return null;
    const source = video.links?.source ?? {};
    return {
      hls: href(source.HLS),
      // HD before the mezzanine: the full quality file for one of these clips
      // is eighty megabytes, which is not a thing to hand a phone on a tap.
      mp4: href(source.HD) ?? href(video.links?.mobile?.source) ?? href(source.href),
      poster: video.thumbnail ?? video.posterImages?.default?.href ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Points a video element at a stream, using hls.js only where it is needed.
 * Safari and iOS play HLS natively, and loading a media library on the one
 * platform that does not need it is how a phone bundle gets fat.
 */
export async function attachStream(
  video: HTMLVideoElement,
  source: ClipSource
): Promise<() => void> {
  const nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';

  if (source.hls && nativeHls) {
    video.src = source.hls;
    return () => {};
  }

  if (source.hls) {
    const { default: Hls } = await import('hls.js');
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(source.hls);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }

  if (source.mp4) {
    video.src = source.mp4;
    return () => {};
  }

  throw new Error('no playable source');
}
