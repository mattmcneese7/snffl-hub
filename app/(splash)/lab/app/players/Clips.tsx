'use client';

import { useEffect, useRef, useState } from 'react';
import { autoplayVars, FATAL_ERRORS, loadYouTube, STATE, YT_HOST, type YTPlayer } from '../../../lib/yt-player';
import { Ms } from '../icons';
import { Rail, Tag, ui as u } from '../ui';
import c from './clips.module.css';

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
  if (!shown.length) return <p className={`${u.sub} ${c.note}`}>None of these clips play here yet.</p>;
  return (
    <Rail label="Highlights">
      {shown.map((c) => (
        <Tile key={c.videoId} clip={c} on={active === c.videoId} onPick={() => setActive(c.videoId)} onFail={() => setGone((g) => [...g, c.videoId])} />
      ))}
    </Rail>
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
    <div className={`${c.clip} ${clip.vertical ? c.tall : ''}`}>
      <div className={`${u.media} ${c.frame}`}>
        {!playing ? (
          <button type="button" className={c.play} onClick={onPick} aria-label={`Play ${clip.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={still} alt="" loading="lazy" onError={() => setStill(clip.still)} />
            <span className={u.mediaTag}>
              <Tag>
                <Ms name="play" size={14} />
                Play
              </Tag>
            </span>
          </button>
        ) : null}
        <span ref={host} className={`${c.host} ${playing ? '' : c.hidden}`} />
      </div>
      {on && playing ? (
        <button type="button" className={`${u.chip} ${c.sound}`} onClick={sound} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>
          <Ms name={muted ? 'volumeOff' : 'volumeUp'} size={16} />
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      ) : null}
      <span className={`${u.title} ${c.title}`}>{clip.title}</span>
      <span className={u.sub}>{clip.channel}</span>
    </div>
  );
}
