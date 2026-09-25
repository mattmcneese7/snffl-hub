'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SLEEPER_LEAGUE_ID } from '@/lib/sleeper-links';

/**
 * Live scores straight from Sleeper in the visitor's browser, Checkpoint 12b.
 *
 * The rest of the page is drawn on the server and refreshed every 15 seconds,
 * but that path stacks caches: the page itself, then the Sleeper call behind
 * it. A score could be most of a minute old. This polls Sleeper's matchups
 * endpoint, 6.6KB, every 10 seconds and updates the numbers in place.
 *
 * Sleeper's CDN holds that endpoint for 60 seconds, so the request carries a
 * parameter that changes once per 10 second window. Every visitor in the same
 * window shares one CDN entry, which keeps the load on Sleeper to about six
 * requests a minute for the whole league however many people are watching.
 *
 * One module level store rather than a context, so the numbers can live in
 * server rendered components without wrapping every page in a provider.
 * LiveRefresh starts it on pages where a game is actually on.
 */

type Snapshot = {
  week: number | null;
  teams: Record<number, number>;
  players: Record<string, number>;
  at: number;
};

/**
 * The value hydration starts from, and it never changes.
 *
 * getServerSnapshot has to return what the server actually rendered, which is
 * always the empty store: the server never polls. Returning the live snapshot
 * instead was a real hydration bug on production, React error #418 on every
 * page during a game. Hydration is not one pass, so the first poll can land
 * after LiveRefresh's effect has run but before the ticker further down the
 * tree has hydrated, and that ticker would then render live numbers against
 * server HTML holding the old ones. Locally everything hydrates in one fast
 * pass, so it only ever showed up in production.
 */
const EMPTY: Snapshot = { week: null, teams: {}, players: {}, at: 0 };

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

const WINDOW_MS = 10_000;
let timer: ReturnType<typeof setInterval> | null = null;
let activeWeek: number | null = null;

type Row = { roster_id: number; points: number | null; players_points: Record<string, number> | null };

async function poll(week: number) {
  try {
    const bucket = Math.floor(Date.now() / WINDOW_MS);
    const res = await fetch(
      `https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/matchups/${week}?t=${bucket}`
    );
    if (!res.ok) return;
    const rows: Row[] = await res.json();
    if (!Array.isArray(rows)) return;
    const teams: Record<number, number> = {};
    const players: Record<string, number> = {};
    for (const row of rows) {
      teams[row.roster_id] = Number(row.points ?? 0);
      for (const [id, points] of Object.entries(row.players_points ?? {})) players[id] = Number(points);
    }
    snapshot = { week, teams, players, at: Date.now() };
    emit();
  } catch {
    // A missed poll keeps the last numbers; the next one catches up.
  }
}

/** Starts polling for a week, or stops when week is null. Idempotent. */
export function runLiveScores(week: number | null) {
  if (week === activeWeek && (timer || week == null)) return;
  if (timer) clearInterval(timer);
  timer = null;
  activeWeek = week;
  if (week == null) return;
  void poll(week);
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void poll(week);
  }, WINDOW_MS);
}

// Development only: lets the poller be started by hand when no game is on.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __snfflLive?: typeof runLiveScores }).__snfflLive = runLiveScores;
}

function useLive() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** A number that briefly lights up when it changes. */
function Ticking({ value, className }: { value: number; className?: string }) {
  const previous = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (value === previous.current) return;
    setFlash(value > previous.current ? 'up' : 'down');
    previous.current = value;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span className={`${className ?? ''}${flash ? ` snffl-tick snffl-tick-${flash}` : ''}`}>
      {value.toFixed(2)}
    </span>
  );
}

/** A team's total for the week, live when polling, the server's otherwise. */
export function LiveTeamPoints({
  rosterId,
  week,
  fallback,
  className,
}: {
  rosterId: number;
  week: number;
  fallback: number;
  className?: string;
}) {
  const live = useLive();
  const value = live.week === week && live.teams[rosterId] != null ? live.teams[rosterId] : fallback;
  return <Ticking value={value} className={className} />;
}

/** A player's points for the week, live when polling. */
export function LivePlayerPoints({
  playerId,
  week,
  fallback,
  className,
}: {
  playerId: string;
  week: number;
  fallback: number;
  className?: string;
}) {
  const live = useLive();
  const value = live.week === week && live.players[playerId] != null ? live.players[playerId] : fallback;
  return <Ticking value={value} className={className} />;
}
