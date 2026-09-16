// Waiver and free agent activity per roster, from Sleeper transactions.
// Same endpoint the Trade Tracker reads, counted rather than detailed.

import { league, scoredWeek } from './league';
import { getTransactions } from './sleeper';

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
};

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
