// The nflverse usage file, as Splash reads it. Built nightly by
// scripts/nflverse-pull.ts and imported rather than read with fs, so Next
// bundles it the same way it bundles data/spine.json.

import data from '@/data/nflverse-2026.json' with { type: 'json' };

/** One player's week. Absent fields were zero. */
export type UsageWeek = {
  tgt?: number;
  rec?: number;
  /** Share of his team's targets. */
  ts?: number;
  /** Share of his team's intended air yards. */
  ays?: number;
  wopr?: number;
  car?: number;
  /** Share of his team's carries. */
  cs?: number;
  /** EPA passing, rushing, receiving. */
  pepa?: number;
  repa?: number;
  cepa?: number;
  /** Offensive snaps and share of his team's. */
  snp?: number;
  sp?: number;
};

export type UsagePlayer = { pos: string; team: string; w: Record<string, UsageWeek> };

export type NflverseFile = {
  pulledAt: string;
  season: number;
  throughWeek: number;
  /** Weeks with box score stats. */
  weeks: number[];
  /** Weeks whose snap counts are in for every team that played. */
  snapWeeks: number[];
  players: Record<string, UsagePlayer>;
};

export const nflverse = data as unknown as NflverseFile;

export const usagePlayer = (playerId: string): UsagePlayer | null => nflverse.players[playerId] ?? null;

export type UsageRow = UsageWeek & {
  week: number;
  /** False when that week's snap counts have not landed yet. */
  snapsIn: boolean;
};

/** His last few weeks with any usage, newest last. */
export function recentUsage(playerId: string, count = 3): UsageRow[] {
  const player = usagePlayer(playerId);
  if (!player) return [];
  const snapWeeks = new Set(nflverse.snapWeeks);
  return Object.entries(player.w)
    .map(([week, row]) => ({ ...row, week: Number(week), snapsIn: snapWeeks.has(Number(week)) || row.sp != null }))
    .filter((r) => Number.isFinite(r.week))
    .sort((a, b) => a.week - b.week)
    .slice(-count);
}
