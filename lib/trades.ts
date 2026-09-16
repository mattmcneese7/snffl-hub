// Trades from Sleeper transactions.
//
// Letter grades come from the Trade Desk in Checkpoint 6, so a trade renders
// here ungraded until then.

import { league, playerOf, scoredWeek, teamByRoster } from './league';
import { getTransactions } from './sleeper';
import type { PlayerLite } from './types';

export type TradeSide = {
  rosterId: number;
  teamName: string;
  manager: string;
  primary: string;
  gets: PlayerLite[];
  picks: string[];
  faab: number;
};

export type Trade = {
  id: string;
  week: number;
  createdAt: number;
  sides: TradeSide[];
};

type RawTransaction = {
  transaction_id?: string;
  type?: string;
  status?: string;
  status_updated?: number;
  roster_ids?: number[];
  adds?: Record<string, number> | null;
  draft_picks?: { season?: string; round?: number; owner_id?: number }[] | null;
  waiver_budget?: { sender?: number; receiver?: number; amount?: number }[] | null;
};

function sideFor(rosterId: number): TradeSide {
  const team = teamByRoster(rosterId);
  return {
    rosterId,
    teamName: team?.teamName ?? `Team ${rosterId}`,
    manager: team?.manager ?? 'Unknown',
    primary: team?.colors?.primary ?? '#72809f',
    gets: [],
    picks: [],
    faab: 0,
  };
}

/** Every completed trade this season, newest first. */
export async function getTrades(): Promise<Trade[]> {
  const throughWeek = Math.max(await scoredWeek(), league.state.week ?? 1);
  const weeks = Array.from({ length: throughWeek }, (_, i) => i + 1);

  const perWeek = await Promise.all(
    weeks.map(async (week) => {
      try {
        return { week, rows: (await getTransactions(week)) as RawTransaction[] };
      } catch {
        // Unofficial shapes move. A bad week yields no trades, not a crash.
        return { week, rows: [] as RawTransaction[] };
      }
    })
  );

  const trades: Trade[] = [];

  for (const { week, rows } of perWeek) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row?.type !== 'trade' || row?.status !== 'complete') continue;
      const rosterIds = row.roster_ids ?? [];
      if (rosterIds.length < 2) continue;

      const sides = new Map<number, TradeSide>();
      for (const rosterId of rosterIds) sides.set(rosterId, sideFor(rosterId));

      // adds maps playerId to the roster receiving them.
      for (const [playerId, toRoster] of Object.entries(row.adds ?? {})) {
        const side = sides.get(toRoster);
        if (side) side.gets.push(playerOf(playerId));
      }

      for (const pick of row.draft_picks ?? []) {
        const side = pick.owner_id != null ? sides.get(pick.owner_id) : undefined;
        if (side && pick.season && pick.round) {
          side.picks.push(`${pick.season} round ${pick.round}`);
        }
      }

      for (const move of row.waiver_budget ?? []) {
        const side = move.receiver != null ? sides.get(move.receiver) : undefined;
        if (side && move.amount) side.faab += move.amount;
      }

      trades.push({
        id: row.transaction_id ?? `${week}-${rosterIds.join('-')}`,
        week,
        createdAt: row.status_updated ?? 0,
        sides: [...sides.values()],
      });
    }
  }

  return trades.sort((a, b) => b.createdAt - a.createdAt || b.week - a.week);
}
