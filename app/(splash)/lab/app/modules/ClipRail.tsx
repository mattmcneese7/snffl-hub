'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { autoplayVars, FATAL_ERRORS, loadYouTube, STATE, YT_HOST, type YTPlayer } from '../../../lib/yt-player';
import { MS } from '../icons';
import s from '../v4.module.css';
import m from './modules.module.css';
import c from './clips.module.css';

// Sound on and off: Material Symbols Rounded, filled, weight 600 (Apache 2.0).
const Glyph = ({ d }: { d: string }) => (
  <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

export type RailClip = {
  videoId: string;
  title: string;
  still: string;
  stillTall: string;
  vertical: boolean;
  channel: string;
  owners: { name: string; started: boolean }[];
  /** Extra labels after the owners, such as the play type and his points. */
  tags?: string[];
};

// ---------- One clip playing at a time, across every rail on the page ----------
//
// Each tile reports how much of it is on screen. The most visible tile at
// 60% or more plays; a tapped tile plays while any of it is on screen. With
// reduced motion asked for, nothing starts until it is tapped.

const VISIBLE = 0.6;
const ratios = new Map<string, number>();
let forced: string | null = null;
let active: string | null = null;
const listeners = new Set<() => void>();
const keyOf = new WeakMap<Element, string>();
let observer: IntersectionObserver | null = null;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function pick() {
  let next: string | null = null;
  if (forced && (ratios.get(forced) ?? 0) > 0) next = forced;
  else {
    forced = null;
    if (!reducedMotion()) {
      let best = VISIBLE;
      for (const [key, ratio] of ratios) {
        if (ratio >= best && (next == null || ratio > best)) {
          next = key;
          best = ratio;
        }
      }
    }
  }
  if (next !== active) {
    active = next;
    for (const fn of listeners) fn();
  }
}

function observe(el: Element, key: string) {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const k = keyOf.get(entry.target);
          if (k) ratios.set(k, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        pick();
      },
      { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] }
    );
  }
  keyOf.set(el, key);
  ratios.set(key, 0);
  observer.observe(el);
}

function unobserve(el: Element, key: string) {
  observer?.unobserve(el);
  ratios.delete(key);
  if (forced === key) forced = null;
  pick();
}

function force(key: string) {
  forced = key;
  pick();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const useActive = () => useSyncExternalStore(subscribe, () => active, () => null);

// ---------- Clips that refused to play, remembered for the visit ----------

const FAILED_KEY = 'splash.clipsFailed';
const readFailed = (): string[] => {
  try {
    const raw = window.sessionStorage.getItem(FAILED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
const rememberFailed = (id: string) => {
  try {
    const list = readFailed();
    if (!list.includes(id)) window.sessionStorage.setItem(FAILED_KEY, JSON.stringify([...list, id].slice(-200)));
  } catch {
    // Storage blocked: the rail still drops it for this page.
  }
};

// ---------- The rail ----------

let railCount = 0;

/**
 * A rail of clips that play in place: muted, inline, one at a time, starting
 * as each comes into view. Tap a playing clip for sound, tap again to mute.
 * A clip that refuses to play here (the owner blocks embeds) drops out and
 * the next one takes its place. Phones see vertical clips as 9:16 tiles.
 */
export default function ClipPlayerRail({ clips, phone, stack = false }: { clips: RailClip[]; phone: boolean; stack?: boolean }) {
  const [railId] = useState(() => `rail${++railCount}`);
  const [gone, setGone] = useState<string[]>([]);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const failed = readFailed();
    if (failed.length) setGone(failed);
  }, []);

  const shown = clips.filter((c) => !gone.includes(c.videoId));

  const onFail = useCallback((videoId: string) => {
    rememberFailed(videoId);
    setGone((list) => (list.includes(videoId) ? list : [...list, videoId]));
  }, []);

  const onEnded = useCallback(
    (videoId: string) => {
      const rail = railRef.current;
      const at = shown.findIndex((c) => c.videoId === videoId);
      const next = shown[at + 1];
      if (!rail || !next) return;
      const el = rail.querySelector<HTMLElement>(`[data-clip="${next.videoId}"]`);
      if (el && !stack) rail.scrollBy({ left: el.getBoundingClientRect().left - rail.getBoundingClientRect().left - 16, behavior: 'smooth' });
      force(`${railId}:${next.videoId}`);
    },
    [shown, railId, stack]
  );

  if (!shown.length) return <p className={c.none}>None of these clips play here yet.</p>;

  return (
    <div ref={railRef} className={stack ? c.stack : s.rail}>
      {shown.map((clip) => (
        <Tile key={clip.videoId} clip={clip} slot={`${railId}:${clip.videoId}`} tall={phone && clip.vertical} stack={stack} onFail={onFail} onEnded={onEnded} />
      ))}
    </div>
  );
}

function Tile({
  clip,
  slot,
  tall,
  stack = false,
  onFail,
  onEnded,
}: {
  clip: RailClip;
  slot: string;
  tall: boolean;
  stack?: boolean;
  onFail: (videoId: string) => void;
  onEnded: (videoId: string) => void;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const isActive = useActive() === slot;
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [still, setStill] = useState(tall ? clip.stillTall : clip.still);

  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;
    observe(el, slot);
    return () => unobserve(el, slot);
  }, [slot]);

  useEffect(() => {
    const host = hostRef.current;
    if (!isActive || !host) return;
    let dead = false;
    const mount = document.createElement('div');
    host.appendChild(mount);
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
            onError: (e) => {
              if (FATAL_ERRORS.has(e.data)) onFail(clip.videoId);
            },
            onStateChange: (e) => {
              if (e.data === STATE.PLAYING) setPlaying(true);
              if (e.data === STATE.ENDED) onEnded(clip.videoId);
            },
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
      host.replaceChildren();
      setPlaying(false);
      setMuted(true);
    };
  }, [isActive, clip.videoId, onFail, onEnded]);

  const onTap = () => {
    if (!isActive) {
      force(slot);
      return;
    }
    const p = player.current;
    if (!p) return;
    // Straight from the tap, so the browser counts it as the user's choice.
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const label = !isActive ? `Play ${clip.title}` : muted ? 'Turn sound on' : 'Turn sound off';

  return (
    <div ref={tileRef} data-clip={clip.videoId} className={`${c.clip} ${stack ? c.inStack : tall ? c.tall : c.wide}`}>
      <span className={`${c.still} ${tall ? c.stillTall : ''}`} data-playing={playing ? '' : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={still} alt="" loading="lazy" onError={() => setStill(clip.still)} />
        <span ref={hostRef} className={c.frame} aria-hidden={!isActive} />
        <button type="button" className={c.tap} onClick={onTap} aria-label={label}>
          <span className={c.play} aria-hidden>
            {!isActive ? (
              <Glyph d={MS.play} />
            ) : muted ? (
              <Glyph d={MS.volumeOff} />
            ) : (
              <Glyph d={MS.volumeUp} />
            )}
          </span>
        </button>
      </span>
      <span className={c.meta}>
        <span className={c.title}>{clip.title}</span>
        <span className={c.source}>{clip.channel}</span>
      </span>
      {clip.owners.length || clip.tags?.length ? (
        <span className={c.owners}>
          {clip.owners.map((o, i) => (
            <span key={i} className={`${s.tag} ${o.started ? s.tagGood : s.tagBad}`}>
              {o.name}, {o.started ? 'Started' : 'Benched'}
            </span>
          ))}
          {clip.tags?.map((t) => (
            <span key={t} className={s.tag}>
              {t}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
