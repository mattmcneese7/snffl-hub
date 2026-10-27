'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { SLEEPER_LEAGUE_ID } from '@/lib/sleeper-links';
import l from './live.module.css';

/**
 * Live scores for 4.0, straight from Sleeper in the browser.
 *
 * Pages are drawn on the server, and while games are on they refresh every
 * 15 seconds. Between refreshes this polls Sleeper's matchups endpoint every
 * 10 seconds and ticks the numbers in place, each change lighting up green
 * or red for a moment. The request carries a parameter that changes once per
 * 10 second window, so everyone watching shares one Sleeper CDN entry.
 *
 * One module level store, so server rendered rows can hold live numbers
 * without a provider. The server snapshot is always empty: the server never
 * polls, and hydrating against live numbers is a mismatch (React #418).
 */
type Snapshot = { week: number | null; teams: Record<number, number>; players: Record<string, number> };

const EMPTY: Snapshot = { week: null, teams: {}, players: {} };
const WINDOW_MS = 10_000;
const REFRESH_MS = 15_000;

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

type Row = { roster_id: number; points: number | null; players_points: Record<string, number> | null };

async function poll(week: number) {
  try {
    const bucket = Math.floor(Date.now() / WINDOW_MS);
    const res = await fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/matchups/${week}?t=${bucket}`);
    if (!res.ok) return;
    const rows: Row[] = await res.json();
    if (!Array.isArray(rows)) return;
    const teams: Record<number, number> = {};
    const players: Record<string, number> = {};
    for (const r of rows) {
      teams[r.roster_id] = Number(r.points ?? 0);
      for (const [id, pts] of Object.entries(r.players_points ?? {})) players[id] = Number(pts);
    }
    snapshot = { week, teams, players };
    listeners.forEach((fn) => fn());
  } catch {
    // A missed poll keeps the last numbers; the next one catches up.
  }
}

// One poller and one refresh timer for the whole page, however many
// components ask for them.
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollWeek: number | null = null;
let owners = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refresh: (() => void) | null = null;

function startPolling(week: number) {
  if (pollWeek === week && pollTimer) return;
  if (pollTimer) clearInterval(pollTimer);
  pollWeek = week;
  void poll(week);
  pollTimer = setInterval(() => document.visibilityState === 'visible' && void poll(week), WINDOW_MS);
}

function stopAll() {
  if (pollTimer) clearInterval(pollTimer);
  if (refreshTimer) clearInterval(refreshTimer);
  pollTimer = refreshTimer = null;
  pollWeek = null;
}

/**
 * Starts live scoring while `live` is true: the 10 second Sleeper poll and the
 * 15 second page refresh, both paused while the phone is in the background
 * and caught up the moment it comes back.
 */
export function LiveStart({ live, week }: { live: boolean; week: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    refresh = () => router.refresh();
    owners += 1;
    startPolling(week);
    if (!refreshTimer) refreshTimer = setInterval(() => document.visibilityState === 'visible' && refresh?.(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refresh?.();
      if (pollWeek != null) void poll(pollWeek);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      owners -= 1;
      if (owners <= 0) {
        owners = 0;
        stopAll();
      }
    };
  }, [live, week, router]);
  return null;
}

// Development only: start polling or nudge a score by hand when no game is on.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __splashLive?: object }).__splashLive = {
    start: startPolling,
    set: (next: Partial<Snapshot>) => {
      snapshot = { ...snapshot, ...next };
      listeners.forEach((fn) => fn());
    },
  };
}

function useLive() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}

function Tick({ value, digits, className }: { value: number; digits: number; className?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (value === prev.current) return;
    setFlash(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={`${className ?? ''} ${flash ? `${l.tick} ${flash === 'up' ? l.up : l.down}` : ''}`}>{value.toFixed(digits)}</span>;
}

/**
 * A score that ticks while games are on: a team's total (`rosterId`) or a
 * player's points (`playerId`) for `week`. Off the live week it simply shows
 * the server's number.
 */
export function LivePoints({
  week,
  rosterId,
  playerId,
  fallback,
  digits = 2,
  className,
}: {
  week: number;
  rosterId?: number;
  playerId?: string;
  fallback: number;
  digits?: number;
  className?: string;
}) {
  const live = useLive();
  let value = fallback;
  if (live.week === week) {
    if (rosterId != null && live.teams[rosterId] != null) value = live.teams[rosterId];
    else if (playerId != null && live.players[playerId] != null) value = live.players[playerId];
  }
  return <Tick value={value} digits={digits} className={className} />;
}
