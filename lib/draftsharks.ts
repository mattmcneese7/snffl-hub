// DraftSharks rankings, credited and linked wherever they appear.
//
// Their public rankings pages load every row from a plain HTML endpoint with no
// login: /ros-rankings/load-rows and /weekly-rankings/load-rows. The pull runs
// from GitHub Actions a few times a week, never from a visitor's page load, so
// DraftSharks sees a handful of requests a week from one identified client.
//
// Standard PPR with 4 point passing touchdowns is DraftSharks' "ppr" slug, and
// it is this league's scoring exactly: the numbers match Matt's custom league
// export row for row (Gibbs 21.1, Nacua 20.8, Chase 19.8 per game).

import dsData from '../data/draftsharks.json' with { type: 'json' };

export const DS_BASE = 'https://www.draftsharks.com';
export const DS_ROS_URL = `${DS_BASE}/ros-rankings/ppr`;
export const DS_WEEKLY_URL = (week: number) => `${DS_BASE}/weekly-rankings/${week}/ppr`;

/** One ranked player as DraftSharks lists them, already matched to Sleeper. */
export type DsRow = {
  /** Overall rank on the board. */
  rank: number;
  /** Rank within the position, the number DraftSharks prints after QB or RB. */
  posRank: number;
  tier: number | null;
  name: string;
  team: string;
  position: string;
  /** Per game fantasy points. */
  floor: number | null;
  consensus: number | null;
  projection: number | null;
  ceiling: number | null;
  /** Rest of season: 3D Value, 100 at the top. Weekly: 3D points. */
  value: number | null;
  /** DraftSharks' remaining strength of schedule as a fraction, printed signed. */
  sos: number | null;
  /** Probability of an injury this season, 0 to 1. Rest of season only. */
  injuryRisk: number | null;
  bye: number | null;
  games: number | null;
  /** Weekly only: the opponent this week. */
  opponent: string | null;
};

export type DsBoard = {
  pulledAt: string;
  week: number;
  ros: Record<string, DsRow>;
  weekly: Record<string, DsRow>;
};

const board = dsData as unknown as DsBoard;

export const draftSharks = board;
export const dsRos = (sleeperId: string): DsRow | undefined => board.ros?.[sleeperId];
export const dsWeekly = (sleeperId: string): DsRow | undefined =>
  board.weekly?.[sleeperId];

// ---------- Parsing, used by scripts/draftsharks-pull.ts ----------

export type ParsedRow = Omit<DsRow, 'rank'> & { rank: number; dsId: string };

const num = (raw: string | undefined): number | null => {
  if (raw == null || raw === '') return null;
  const n = Number(raw.replace(/[%,]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const pct = (raw: string | undefined): number | null => {
  const n = num(raw);
  return n == null ? null : Number((n / 100).toFixed(4));
};

/** data-value of the cell carrying the given data-attribute, or undefined. */
function cell(chunk: string, attribute: string): string | undefined {
  const re = new RegExp(`data-value="([^"]*)"\\s+data-attribute="${attribute.replace(/\./g, '\\.')}"`);
  return chunk.match(re)?.[1];
}

/**
 * Rows from one load-rows response.
 *
 * Every row is a <tbody data-player-row> carrying the name, position and tier
 * as attributes, and a set of cells tagged with data-attribute and data-value.
 * Reading those attributes rather than the visible text keeps the parser clear
 * of the display formatting, which pads, rounds and hides columns by viewport.
 */
export function parseRows(html: string, kind: 'ros' | 'weekly'): ParsedRow[] {
  const chunks = html.split(/<tbody\s+data-player-row/).slice(1);
  const out: ParsedRow[] = [];

  for (const chunk of chunks) {
    const attr = (name: string) => chunk.match(new RegExp(`${name}="([^"]*)"`))?.[1];
    const dsId = attr('data-key');
    const name = attr('data-player-name');
    const position = attr('data-fantasy-position');
    const rank = num(chunk.match(/rank-index">\s*<span>\s*(\d+)\s*<\/span>/)?.[1]);
    if (!dsId || !name || !position || rank == null) continue;

    const team = chunk.match(/player-details-group__team-name">\s*([A-Z]{2,3})\s*</)?.[1] ?? '';
    const posRank = num(chunk.match(/pos-roster-spot="[A-Z]+">\s*(\d+)\s*</)?.[1]) ?? 0;

    out.push({
      dsId,
      rank,
      posRank,
      tier: num(attr('data-tier-overall')),
      name: decode(name),
      team,
      position,
      floor: num(cell(chunk, kind === 'ros' ? 'rosWeeklyFloorPts' : 'weeklyFloorPts')),
      consensus: num(cell(chunk, 'consensus_projection')),
      projection: num(cell(chunk, kind === 'ros' ? 'rosWeeklyPts' : 'weeklyPts')),
      ceiling: num(cell(chunk, kind === 'ros' ? 'rosWeeklyCeilingPts' : 'weeklyCeilingPts')),
      value: num(cell(chunk, kind === 'ros' ? 'dsValue' : 'weekly3dPts')),
      sos: pct(cell(chunk, 'strength_of_schedule')),
      injuryRisk: kind === 'ros' ? pct(cell(chunk, 'player.sipPlayerProfile.injury_prob')) : null,
      bye: num(cell(chunk, 'player.team.bye')),
      games: kind === 'ros' ? num(cell(chunk, 'games_played')) : null,
      opponent: kind === 'weekly' ? (cell(chunk, 'matchup') ?? null) : null,
    });
  }
  return out;
}

function decode(text: string): string {
  return text
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/** DraftSharks team codes that differ from Sleeper's. */
export const DS_TEAM_TO_SLEEPER: Record<string, string> = {
  LVR: 'LV',
  JAC: 'JAX',
  WSH: 'WAS',
  LA: 'LAR',
};
