'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { autoplayVars, FATAL_ERRORS, loadYouTube, STATE, YT_HOST, type YTPlayer } from '../../../lib/yt-player';
import { MX } from './icons';
import m from './modules.module.css';
import c from './clips.module.css';

// Sound on and off: Material Symbols Rounded, filled, weight 600 (Apache 2.0).
const VOLUME_ON = 'M791.3-481q0-92.87-52.21-167.59-52.22-74.71-136.65-109.84-13.14-5-18.14-17.14-5-12.13 1.14-24.82 5.56-13.13 18.91-18.2 13.35-5.06 27.48.5 102.13 42.7 163.91 133.83 61.78 91.13 61.78 203.26t-61.78 203.26q-61.78 91.13-163.91 133.83-14.13 5.56-27.48.5-13.35-5.07-18.91-18.2-6.14-12.69-1.14-24.82 5-12.14 18.14-17.7 84.43-34.57 136.65-109.28Q791.3-388.13 791.3-481ZM270.96-345.87H142.65q-17.52 0-28.85-11.33-11.32-11.32-11.32-28.28v-189.04q0-16.96 11.32-28.57 11.33-11.61 28.85-11.61h128.31l152.39-151.82q18.52-19.09 43.24-9.05 24.71 10.05 24.71 36.27v518.04q0 26.78-24.71 36.83-24.72 10.04-43.24-9.05L270.96-345.87ZM677.52-480q0 52.57-26.85 95.41-26.84 42.85-75.54 65.98-9.13 4.57-16.48-1-7.35-5.56-7.35-15.26v-291.26q0-9.7 7.35-14.98 7.35-5.28 16.48-.72 48.7 23.13 75.54 66.7 26.85 43.56 26.85 95.13Z';
const VOLUME_OFF = 'M684.39-176.13q-14.74 10.3-30.69 18.89-15.96 8.59-33.13 15.46-13.13 6.13-26.48.28t-18.35-19.54q-4.44-10.44-.35-21.16 4.09-10.71 13.83-16.84 13.3-4.44 25.11-10.59 11.8-6.15 23.1-15.02L483.74-380.04v158.78q0 26.78-24.44 36.83-24.43 10.04-43.52-9.05L263.96-345.87H135.09q-16.96 0-28.29-11.33-11.32-11.32-11.32-28.28v-189.04q0-16.96 11.32-28.57 11.33-11.61 28.29-11.61h116.95L57.56-811.44q-10.13-10.13-9.63-23.47.5-13.35 10.63-23.48 10.14-10.13 23.77-10.13 13.63 0 23.76 10.13l735.69 744.17q10.13 10.13 10.13 23.48t-10.13 23.48q-10.13 10.7-24.26 10.7t-24.26-10.7L684.39-176.13ZM784.3-481q0-92.43-52.21-167.37-52.22-74.93-136.65-110.06-13.14-5-18.14-17.14-5-12.13 1.14-24.82 5.56-13.13 18.91-18.2 13.35-5.06 27.48.5 101.56 42.13 163.63 133.05 62.06 90.91 62.06 204.04 0 38-7.5 74.43-7.5 36.44-22.93 70.87-8.57 18.7-21.2 22.77-12.63 4.06-24.76-1.22-12.13-5.28-18.48-15.92-6.35-10.63-.35-23.32 14.44-28.87 21.44-61.31 7-32.43 7.56-66.3ZM589.57-631.39q38.56 25.82 59.76 65.19 21.19 39.37 21.19 86.2 0 6.3-.28 12.74-.28 6.43-1.15 12.74-1.44 12.82-13.83 16.67-12.39 3.85-22.65-6.98L575-502.43q-6.13-6.14-8.7-13.11-2.56-6.98-2.56-14.68v-85.91q0-10.7 8.35-15.76 8.35-5.07 17.48.5Zm-210.14-70q-6.13-6.13-6.13-14.39 0-8.26 6.13-14.4l36.35-36.34q19.09-19.09 43.52-9.05 24.44 10.05 24.44 36.27v94.91q0 13.39-12.61 18.02-12.61 4.63-21.87-4.63l-69.83-70.39Z';
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
export default function ClipPlayerRail({ clips, phone }: { clips: RailClip[]; phone: boolean }) {
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
      if (el) rail.scrollBy({ left: el.getBoundingClientRect().left - rail.getBoundingClientRect().left - 16, behavior: 'smooth' });
      force(`${railId}:${next.videoId}`);
    },
    [shown, railId]
  );

  if (!shown.length) return <p className={c.none}>None of these clips play here yet.</p>;

  return (
    <div ref={railRef} className={m.rail}>
      {shown.map((clip) => (
        <Tile key={clip.videoId} clip={clip} slot={`${railId}:${clip.videoId}`} tall={phone && clip.vertical} onFail={onFail} onEnded={onEnded} />
      ))}
    </div>
  );
}

function Tile({
  clip,
  slot,
  tall,
  onFail,
  onEnded,
}: {
  clip: RailClip;
  slot: string;
  tall: boolean;
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
    <div ref={tileRef} data-clip={clip.videoId} className={`${c.clip} ${tall ? c.tall : c.wide}`}>
      <span className={`${c.still} ${tall ? c.stillTall : ''}`} data-playing={playing ? '' : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={still} alt="" loading="lazy" onError={() => setStill(clip.still)} />
        <span ref={hostRef} className={c.frame} aria-hidden={!isActive} />
        <button type="button" className={c.tap} onClick={onTap} aria-label={label}>
          <span className={c.play} aria-hidden>
            {!isActive ? (
              <Glyph d={MX.play} />
            ) : muted ? (
              <Glyph d={VOLUME_OFF} />
            ) : (
              <Glyph d={VOLUME_ON} />
            )}
          </span>
        </button>
      </span>
      <span className={c.title}>{clip.title}</span>
      <span className={c.source}>{clip.channel}</span>
      {clip.owners.length || clip.tags?.length ? (
        <span className={c.owners}>
          {clip.owners.map((o, i) => (
            <span key={i} className={`${m.mk} ${o.started ? m.mkQuiet : m.mkBad}`}>
              {o.name}, {o.started ? 'Started' : 'Benched'}
            </span>
          ))}
          {clip.tags?.map((t) => (
            <span key={t} className={`${m.mk} ${m.mkQuiet}`}>
              {t}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
