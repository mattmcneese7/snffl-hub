'use client';

import { useEffect, useRef, useState } from 'react';
import { autoplayVars, FATAL_ERRORS, loadYouTube, STATE, YT_HOST, type YTPlayer } from '../../../lib/yt-player';
import s from '../v4.module.css';
import p from './p4.module.css';
import { Ms } from '../icons';

export type Clip = { videoId: string; title: string; still: string; stillTall: string; vertical: boolean; channel: string };

/**
 * Highlights, playing right here: a rail of stills, one playing at a time.
 * A clip starts muted the moment it is chosen (phones refuse sound until
 * asked), and the Sound button beside it asks. A clip YouTube refuses to
 * play off its own site drops out of the rail.
 */
export default function Clips({ clips }: { clips: Clip[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const shown = clips.filter((c) => !gone.includes(c.videoId));
  if (!shown.length) return <p className={p.via}>None of these clips play here yet.</p>;
  return (
    <div className={s.rail}>
      {shown.map((c) => (
        <Tile key={c.videoId} clip={c} on={active === c.videoId} onPick={() => setActive(c.videoId)} onFail={() => setGone((g) => [...g, c.videoId])} />
      ))}
    </div>
  );
}

function Tile({ clip, on, onPick, onFail }: { clip: Clip; on: boolean; onPick: () => void; onFail: () => void }) {
  const host = useRef<HTMLSpanElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [still, setStill] = useState(clip.vertical ? clip.stillTall : clip.still);
  const fail = useRef(onFail);
  useEffect(() => {
    fail.current = onFail;
  });

  useEffect(() => {
    const el = host.current;
    if (!on || !el) return;
    let dead = false;
    const mount = document.createElement('div');
    el.appendChild(mount);
    loadYouTube()
      .then((YT) => {
        if (dead) return;
        player.current = new YT.Player(mount, {
          host: YT_HOST,
          videoId: clip.videoId,
          width: '100%',
          height: '100%',
          playerVars: autoplayVars(window.location.origin),
          events: {
            onReady: (e) => {
              e.target.mute();
              e.target.playVideo();
            },
            onError: (e) => FATAL_ERRORS.has(e.data) && fail.current(),
            onStateChange: (e) => e.data === STATE.PLAYING && setPlaying(true),
          },
        });
      })
      .catch(() => {});
    return () => {
      dead = true;
      try {
        player.current?.destroy();
      } catch {
        // Already gone.
      }
      player.current = null;
      el.replaceChildren();
      setPlaying(false);
      setMuted(true);
    };
  }, [on, clip.videoId]);

  const sound = () => {
    const pl = player.current;
    if (!pl) return;
    // Straight from the tap, so the browser counts it as asked for.
    if (pl.isMuted()) {
      pl.unMute();
      setMuted(false);
    } else {
      pl.mute();
      setMuted(true);
    }
  };

  return (
    <div className={`${p.clip} ${clip.vertical ? p.clipTall : ''}`}>
      <div className={p.clipFrame}>
        {!playing ? (
          <button type="button" onClick={onPick} aria-label={`Play ${clip.title}`} style={{ all: 'unset', position: 'absolute', inset: 0, cursor: 'pointer' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={still} alt="" loading="lazy" onError={() => setStill(clip.still)} />
            <span className={p.clipPlay}>
              <Ms name="play" size={26} />
            </span>
          </button>
        ) : null}
        <span ref={host} className={p.clipHost} style={playing ? undefined : { opacity: 0 }} />
        {on && playing ? (
          <button type="button" className={p.clipSound} onClick={sound} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>
            <Ms name={muted ? 'volumeOff' : 'volumeUp'} size={16} />
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        ) : null}
      </div>
      <b>{clip.title}</b>
      <small>{clip.channel}</small>
    </div>
  );
}
