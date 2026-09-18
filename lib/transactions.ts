// Waiver and free agent activity per roster, from Sleeper transactions.
// Same endpoint the Trade Tracker reads, counted rather than detailed.

import { league, scoredWeek } from './league.ts';
import { getTransactions } from './sleeper.ts';

export type PickupCounts = {
  waiver: number;
  freeAgent: number;
  drops: number;
  total: number;
};

type RawTransaction = {
  type?: string;
  status?: string;
  adds?: Record<string, number> | null;
  drops?: Record<string, number> | null;
  status_updated?: number;
};

export type RecentAdd = { rosterId: number; kind: 'waiver' | 'free_agent'; at: number };

/**
 * Players added in the last few days, by waiver claim or free agent pickup.
 * The Feed's Waiver Adds shows their clips: who just got picked up is the clip
 * the rest of the league wants to see.
 */
export async function getRecentAdds(days = 8): Promise<Record<string, RecentAdd>> {
  const week = Math.max(await scoredWeek(), league.state.week || 1);
  const since = Date.now() - days * 24 * 3600 * 1000;
  const out: Record<string, RecentAdd> = {};
  for (const w of [...new Set([week, Math.max(1, week - 1)])]) {
    let rows: RawTransaction[] = [];
    try {
      rows = (await getTransactions(w)) as RawTransaction[];
    } catch {
      continue;
    }
    for (const row of Array.isArray(rows) ? rows : []) {
      if (row?.status !== 'complete') continue;
      if (row.type !== 'waiver' && row.type !== 'free_agent') continue;
      if ((row.status_updated ?? 0) < since) continue;
      for (const [playerId, rosterId] of Object.entries(row.adds ?? {})) {
        out[playerId] = { rosterId, kind: row.type, at: row.status_updated ?? 0 };
      }
    }
  }
  return out;
}

const empty = (): PickupCounts => ({ waiver: 0, freeAgent: 0, drops: 0, total: 0 });

/** Keyed by roster id. Every roster is present, including the quiet ones. */
export async function getPickupCounts(): Promise<Record<number, PickupCounts>> {
  const throughWeek = Math.max(await scoredWeek(), league.state.week || 1);
  const weeks = Array.from({ length: throughWeek }, (_, i) => i + 1);

  const perWeek = await Promise.all(
    weeks.map(async (week) => {
      try {
        return (await getTransactions(week)) as RawTransaction[];
      } catch {
        // Unofficial shapes move. A bad week contributes nothing.
        return [] as RawTransaction[];
      }
    })
  );

  const counts: Record<number, PickupCounts> = {};
  const bump = (rosterId: number) => (counts[rosterId] ??= empty());

  for (const rows of perWeek) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row?.status !== 'complete') continue;
      const kind = row?.type;
      if (kind !== 'waiver' && kind !== 'free_agent') continue;

      for (const rosterId of Object.values(row.adds ?? {})) {
        const entry = bump(rosterId);
        if (kind === 'waiver') entry.waiver += 1;
        else entry.freeAgent += 1;
        entry.total += 1;
      }
      for (const rosterId of Object.values(row.drops ?? {})) {
        bump(rosterId).drops += 1;
      }
    }
  }

  return counts;
}
