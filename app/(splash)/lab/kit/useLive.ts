'use client';

import { useEffect, useRef, useState } from 'react';
import type { LabGame, LabLive, LabStarter } from './liveFeed';

function pointsOf(d: LabLive) {
  const m = new Map<string, number>();
  for (const g of d.games) for (const s of [g.away, g.home]) for (const p of s.starters) m.set(`${s.rosterId}:${p.id}`, p.points);
  return m;
}

export type ScoreEvent = { key: string; game: LabGame; rosterId: number; firstName: string; player: LabStarter; delta: number };

/**
 * The live feed, polled: every 20 seconds while a game is on and the page is
 * visible, every 2 minutes otherwise, and at once when the page comes back.
 * Each read is diffed against the last, and any starter whose points moved
 * becomes a ScoreEvent, so the island, the gamecast and the toasts all hear
 * the same news. Nothing is invented: a quiet Tuesday produces no events.
 */
export function useLive(week?: number, onEvents?: (e: ScoreEvent[]) => void, initial: LabLive | null = null) {
  const [data, setData] = useState<LabLive | null>(initial);
  const last = useRef<Map<string, number> | null>(initial ? pointsOf(initial) : null);
  const cb = useRef(onEvents);
  cb.current = onEvents;

  useEffect(() => {
    let timer = 0;
    let dead = false;
    const read = async () => {
      window.clearTimeout(timer);
      try {
        const res = await fetch(`/api/lab/live${week ? `?week=${week}` : ''}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const next: LabLive = await res.json();
        if (dead) return;
        const seen = new Map<string, number>();
        const events: ScoreEvent[] = [];
        for (const g of next.games)
          for (const s of [g.away, g.home])
            for (const p of s.starters) {
              const k = `${s.rosterId}:${p.id}`;
              seen.set(k, p.points);
              const before = last.current?.get(k);
              if (before != null && Math.abs(p.points - before) >= 0.01) {
                events.push({ key: `${k}:${next.at}`, game: g, rosterId: s.rosterId, firstName: s.firstName, player: p, delta: Number((p.points - before).toFixed(2)) });
              }
            }
        last.current = seen;
        setData(next);
        if (events.length) cb.current?.(events);
        timer = window.setTimeout(read, next.anyLive ? 20_000 : 120_000);
      } catch {
        timer = window.setTimeout(read, 60_000);
      }
    };
    const vis = () => document.visibilityState === 'visible' && read();
    read();
    document.addEventListener('visibilitychange', vis);
    return () => {
      dead = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [week]);

  return data;
}

/** The game to follow: yours if this device picked a team, else the closest one in play, else the closest. */
export function gameFor(data: LabLive | null, mine: number | null): { game: LabGame; me: 'away' | 'home' | null } | null {
  if (!data?.games.length) return null;
  if (mine != null) {
    const g = data.games.find((x) => x.away.rosterId === mine || x.home.rosterId === mine);
    if (g) return { game: g, me: g.away.rosterId === mine ? 'away' : 'home' };
  }
  const pool = data.games.some((g) => g.inPlay) ? data.games.filter((g) => g.inPlay) : data.games;
  const close = [...pool].sort((a, b) => Math.abs(a.away.winProb - 0.5) - Math.abs(b.away.winProb - 0.5))[0];
  return { game: close, me: null };
}
