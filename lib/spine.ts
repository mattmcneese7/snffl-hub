// The statistics spine, as the app reads it. Checkpoint 13.
//
// Built nightly by scripts/stats-spine.ts and imported rather than read with
// fs, the same as every other data file here: an fs read works locally and
// then 404s on Vercel.
//
// Everything in it is scored on this league's rules by the engine Checkpoint
// 12 proved, so a defence that concedes 35 to receivers concedes 35 *here*,
// not in some generic full PPR league.

import spineData from '../data/spine.json' with { type: 'json' };

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
export type Pos = (typeof POSITIONS)[number];

export type DvpEntry = {
  /** Raw points conceded per game. Honest, and noisy early. */
  perGame: number;
  /** Games of evidence behind it. */
  games: number;
  /** Shrunk toward the league average. This is the one to use. */
  adjusted: number;
  /** Adjusted against the position average. Above 1 is a defence to attack. */
  vsAverage: number;
  /** 1 concedes most. */
  rank: number;
};

export type UsageEntry = {
  weeks: number;
  snapShare: number;
  targetShare: number;
  carryShare: number;
  /** Red zone targets plus carries, per game. */
  redZone: number;
  pointsPerGame: number;
  recent: {
    weeks: number;
    snapShare: number;
    targetShare: number;
    carryShare: number;
    pointsPerGame: number;
  } | null;
};

export type Fixture = { week: number; opponent: string; home: boolean };

type Spine = {
  season: string;
  throughWeek: number;
  builtAt: string;
  shrinkGames: number;
  positionMean: Record<string, number>;
  dvp: Record<string, Partial<Record<Pos, DvpEntry>>>;
  usage: Record<string, UsageEntry>;
  schedule: Record<string, Fixture[]>;
};

export const spine = spineData as unknown as Spine;

/** What this defence concedes to this position. */
export const dvpFor = (defense: string, pos: Pos): DvpEntry | null =>
  spine.dvp[defense]?.[pos] ?? null;

export const usageFor = (playerId: string): UsageEntry | null => spine.usage[playerId] ?? null;

/**
 * The next few fixtures for an NFL team.
 *
 * A bye is an absence rather than an entry, so asking for three weeks can
 * return two. That is the honest shape: a caller that wants to say "two of his
 * next three are soft" needs to know one of them does not exist.
 */
export const scheduleAhead = (team: string, weeks = 3): Fixture[] =>
  (spine.schedule[team] ?? []).slice(0, weeks);

/**
 * How much easier or harder than average this matchup is, as a multiplier.
 *
 * Deliberately not applied to anything yet. Checkpoint 14 is where a
 * projection gets adjusted by it, and doing that here would hide the decision
 * inside a getter.
 */
export function matchupFactor(defense: string, pos: Pos): number {
  return dvpFor(defense, pos)?.vsAverage ?? 1;
}

/**
 * Whether the defence numbers are worth reading yet.
 *
 * Through two games they are mostly the league average wearing a team's name,
 * which the shrinkage makes true rather than hides. Anything showing a
 * defensive rating to a reader should say how thin it is, and this is how it
 * asks.
 */
export const dvpConfidence = (): 'thin' | 'fair' | 'good' => {
  const games = spine.throughWeek;
  if (games < 4) return 'thin';
  if (games < 8) return 'fair';
  return 'good';
};

/**
 * A player's trend, as a word.
 *
 * Snap share is the honest measure of a role: points swing on touchdowns, a
 * share does not. Ten points of snap share is the threshold because anything
 * under it is rotation noise rather than a decision by a coach.
 */
export function usageTrend(playerId: string): 'rising' | 'falling' | 'steady' | null {
  const entry = usageFor(playerId);
  if (!entry?.recent) return null;
  const delta = entry.recent.snapShare - entry.snapShare;
  if (delta > 0.1) return 'rising';
  if (delta < -0.1) return 'falling';
  return 'steady';
}
