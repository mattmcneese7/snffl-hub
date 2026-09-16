// Season stats for player research, Checkpoint 5c.
//
// data/player-stats.json holds Sleeper's raw stat lines. This module decides
// which fields matter and what to call them, and it answers to the league's own
// scoring rather than Sleeper's defaults: PPR receptions, 25 yards per passing
// point, distance banded field goals, and a defense scored on takeaways plus
// banded points and yards allowed.

import statsData from '../data/player-stats.json' with { type: 'json' };
import type { RawStats, StatBlock, StatLine } from './types.ts';

const STATS = statsData as unknown as Record<string, RawStats>;

/** Raw season line, or null for a player who has not played yet. */
export function statsFor(playerId: string): RawStats | null {
  return STATS[playerId] ?? null;
}

const num = (value: number | undefined, digits = 0): string =>
  value == null ? '0' : value.toFixed(digits);

/** A field the league does not score, or a player did not record, is dropped. */
function line(stats: RawStats, key: string, label: string, digits = 0): StatLine | null {
  const value = stats[key];
  if (value == null) return null;
  return { label, value: num(value, digits) };
}

/** Two counting stats that read as one, such as completions and attempts. */
function pair(stats: RawStats, a: string, b: string, label: string): StatLine | null {
  if (stats[a] == null && stats[b] == null) return null;
  return { label, value: `${num(stats[a])}/${num(stats[b])}` };
}

/**
 * Share of the team's offensive snaps. Sleeper reports the player's snaps and
 * the team's separately, so the percentage has to be derived.
 */
function snapShare(stats: RawStats): StatLine | null {
  const offense = Boolean(stats.off_snp != null && stats.tm_off_snp);
  const played = offense ? stats.off_snp : stats.st_snp;
  const team = offense ? stats.tm_off_snp : stats.tm_st_snp;
  if (played == null || !team) return null;
  // A kicker has no offensive snaps, so the figure comes from special teams.
  // Labeling that "Snap Share" would read as offensive usage, which it is not.
  return {
    label: offense ? 'Snap Share' : 'ST Snap Share',
    value: `${((played / team) * 100).toFixed(0)}%`,
  };
}

function block(title: string, lines: (StatLine | null)[]): StatBlock | null {
  const kept = lines.filter((entry): entry is StatLine => entry !== null);
  return kept.length ? { title, lines: kept } : null;
}

function passing(stats: RawStats): StatBlock | null {
  return block('Passing', [
    pair(stats, 'pass_cmp', 'pass_att', 'Comp/Att'),
    line(stats, 'cmp_pct', 'Comp %', 1),
    line(stats, 'pass_yd', 'Yards'),
    line(stats, 'pass_td', 'Touchdowns'),
    line(stats, 'pass_int', 'Interceptions'),
    line(stats, 'pass_rtg', 'Rating', 1),
    line(stats, 'pass_lng', 'Long'),
    line(stats, 'pass_sack', 'Sacked'),
  ]);
}

function rushing(stats: RawStats): StatBlock | null {
  return block('Rushing', [
    line(stats, 'rush_att', 'Attempts'),
    line(stats, 'rush_yd', 'Yards'),
    line(stats, 'rush_td', 'Touchdowns'),
    line(stats, 'rush_ypa', 'Yards per Carry', 1),
    line(stats, 'rush_lng', 'Long'),
    line(stats, 'rush_fd', 'First Downs'),
  ]);
}

function receiving(stats: RawStats): StatBlock | null {
  // Receptions lead because the league is full PPR, so each one is a point.
  return block('Receiving', [
    line(stats, 'rec', 'Receptions'),
    line(stats, 'rec_tgt', 'Targets'),
    line(stats, 'rec_yd', 'Yards'),
    line(stats, 'rec_td', 'Touchdowns'),
    line(stats, 'rec_ypr', 'Yards per Catch', 1),
    line(stats, 'rec_lng', 'Long'),
    line(stats, 'rec_fd', 'First Downs'),
    line(stats, 'rec_drop', 'Drops'),
  ]);
}

function kicking(stats: RawStats): StatBlock[] {
  // The league scores field goals by distance, 3 points inside 40 rising to 6
  // from 60, so the bands are the story and a bare make total would mislead.
  const bands = block('Field Goals by Distance', [
    line(stats, 'fgm_0_19', 'Made, Inside 20'),
    line(stats, 'fgm_20_29', 'Made, 20 to 29'),
    line(stats, 'fgm_30_39', 'Made, 30 to 39'),
    line(stats, 'fgm_40_49', 'Made, 40 to 49'),
    line(stats, 'fgm_50_59', 'Made, 50 to 59'),
    line(stats, 'fgm_60p', 'Made, 60 Plus'),
  ]);
  const totals = block('Kicking', [
    pair(stats, 'fgm', 'fga', 'FG Made/Att'),
    line(stats, 'fgm_pct', 'FG %', 1),
    line(stats, 'fgm_lng', 'Long'),
    line(stats, 'fgmiss', 'Missed'),
    pair(stats, 'xpm', 'xpa', 'XP Made/Att'),
    line(stats, 'xpmiss', 'XP Missed'),
  ]);
  return [totals, bands].filter((entry): entry is StatBlock => entry !== null);
}

function defense(stats: RawStats): StatBlock[] {
  const takeaways = block('Takeaways and Pressure', [
    line(stats, 'sack', 'Sacks', 1),
    line(stats, 'int', 'Interceptions'),
    line(stats, 'ff', 'Forced Fumbles'),
    line(stats, 'fum_rec', 'Fumbles Recovered'),
    line(stats, 'safe', 'Safeties'),
    line(stats, 'def_td', 'Defensive TDs'),
    line(stats, 'qb_hit', 'QB Hits'),
    line(stats, 'def_pass_def', 'Passes Defended'),
  ]);
  // Both are scored in bands that run from plus 5 to minus 7, so they belong
  // together and they belong on the page.
  const allowed = block('Allowed', [
    line(stats, 'pts_allow', 'Points'),
    line(stats, 'yds_allow', 'Yards'),
    line(stats, 'tkl', 'Tackles'),
    line(stats, 'tkl_loss', 'Tackles for Loss'),
  ]);
  return [takeaways, allowed].filter((entry): entry is StatBlock => entry !== null);
}

function fantasy(stats: RawStats): StatBlock | null {
  return block('Fantasy', [
    line(stats, 'pts_ppr', 'PPR Points', 2),
    line(stats, 'pos_rank_ppr', 'Position Rank'),
    line(stats, 'gp', 'Games Played'),
    line(stats, 'gs', 'Games Started'),
    snapShare(stats),
  ]);
}

/**
 * The stat blocks worth showing for one player, in reading order. Position
 * decides the shape, but an empty block is dropped rather than shown blank, so
 * a running back with no carries does not get an empty Rushing card.
 */
export function statBlocksFor(position: string, stats: RawStats | null): StatBlock[] {
  if (!stats) return [];

  const blocks: (StatBlock | null)[] = [];

  switch (position) {
    case 'QB':
      blocks.push(passing(stats), rushing(stats), receiving(stats));
      break;
    case 'RB':
      blocks.push(rushing(stats), receiving(stats));
      break;
    case 'WR':
    case 'TE':
      blocks.push(receiving(stats), rushing(stats));
      break;
    case 'K':
      blocks.push(...kicking(stats));
      break;
    case 'DEF':
      blocks.push(...defense(stats));
      break;
    default:
      blocks.push(rushing(stats), receiving(stats));
  }

  blocks.push(fantasy(stats));
  return blocks.filter((entry): entry is StatBlock => entry !== null);
}

/** Total yards from scrimmage plus passing, for sorting the Players list. */
export function totalYards(playerId: string): number {
  const stats = STATS[playerId];
  if (!stats) return 0;
  return (stats.pass_yd ?? 0) + (stats.rush_yd ?? 0) + (stats.rec_yd ?? 0);
}

/** Every touchdown a player has scored or thrown. */
export function totalTouchdowns(playerId: string): number {
  const stats = STATS[playerId];
  if (!stats) return 0;
  return (
    (stats.pass_td ?? 0) + (stats.rush_td ?? 0) + (stats.rec_td ?? 0) + (stats.def_td ?? 0)
  );
}

/** Rank within the player's own position, PPR scoring. Absent sorts last. */
export function positionRank(playerId: string): number | null {
  return STATS[playerId]?.pos_rank_ppr ?? null;
}

/**
 * Snap share as a number, for sorting. Falls back to special teams exactly as
 * the stat block does, so the list cannot order a kicker by a figure that
 * disagrees with the one on their own page.
 */
export function snapSharePct(playerId: string): number {
  const stats = STATS[playerId];
  if (!stats) return 0;
  if (stats.off_snp != null && stats.tm_off_snp) return (stats.off_snp / stats.tm_off_snp) * 100;
  if (stats.st_snp != null && stats.tm_st_snp) return (stats.st_snp / stats.tm_st_snp) * 100;
  return 0;
}
