'use client';

import { useEffect, useRef, useState } from 'react';
import { attachStream, clipSource } from '@/lib/espn-playback';

/**
 * An ESPN clip playing in our own video element.
 *
 * The source is resolved when the clip is opened, because these are CDN paths
 * ESPN can move; storing them would mean a column that goes stale. Only the
 * clip on screen resolves and plays, so a reel of forty costs one request.
 *
 * Muted to start, because that is the only way a browser will begin playing
 * anything on its own, with sound one tap away.
 */
export default function ClipVideo({
  espnId,
  poster,
  title,
}: {
  espnId: string;
  poster: string | null;
  title: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let dead = false;
    let detach: (() => void) | undefined;

    (async () => {
      const source = await clipSource(espnId);
      const element = video.current;
      if (dead || !element) return;
      if (!source || (!source.hls && !source.mp4)) {
        setState('failed');
        return;
      }
      try {
        detach = await attachStream(element, source);
        if (dead) {
          detach?.();
          return;
        }
        setState('ready');
        // A refused autoplay is not a failure: the clip is on screen with its
        // controls, and a tap starts it.
        void element.play().catch(() => {});
      } catch {
        if (!dead) setState('failed');
      }
    })();

    return () => {
      dead = true;
      detach?.();
    };
  }, [espnId]);

  if (state === 'failed') {
    return (
      <a
        className="snffl-clip-fallback"
        href={`https://www.espn.com/video/clip/_/id/${espnId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Watch on ESPN
      </a>
    );
  }

  return (
    <div className="snffl-clip-video">
      <video
        ref={video}
        poster={poster ?? undefined}
        playsInline
        controls
        muted={muted}
        loop
        preload="auto"
        aria-label={title}
      />
      {state === 'ready' ? (
        <button
          type="button"
          className="snffl-clip-sound snffl-glass"
          onClick={() => {
            const element = video.current;
            if (!element) return;
            element.muted = !element.muted;
            setMuted(element.muted);
            void element.play().catch(() => {});
          }}
        >
          {muted ? 'Sound on' : 'Mute'}
        </button>
      ) : (
        <span className="snffl-clip-loading">Loading</span>
      )}
    </div>
  );
}
