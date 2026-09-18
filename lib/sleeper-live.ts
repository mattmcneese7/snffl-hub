// Per player stat lines and projected lines for one week, from Sleeper's public
// stats and projections endpoints. The same feed Sleeper's own app scores from,
// so a stat line here never disagrees with the points beside it.
//
// Fetched one position at a time: the full projections payload is about 2.1MB,
// over Next's 2MB data cache ceiling, and a request that cannot be cached is
// refetched on every render. Each position alone is well under it.

const BASE = 'https://api.sleeper.com';
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;

/** The stat keys the site renders. Everything else is dropped on arrival. */
const KEEP = [
  'pts_ppr',
  'pass_cmp',
  'pass_att',
  'pass_yd',
  'pass_td',
  'pass_int',
  'rush_att',
  'rush_yd',
  'rush_td',
  'rec',
  'rec_tgt',
  'rec_yd',
  'rec_td',
  'fum_lost',
  'fgm',
  'fga',
  'fgm_lng',
  'xpm',
  'xpa',
  'def_td',
  'def_int',
  'int',
  'sack',
  'fum_rec',
  'pts_allow',
  'off_snp',
  'tm_off_snp',
] as const;

export type StatMap = Partial<Record<(typeof KEEP)[number], number>>;

export type PlayerWeekLine = {
  stats: StatMap;
  /** Sleeper's injury designation, "Questionable", "Out" and so on. */
  injury: string | null;
  opponent: string | null;
};

type RawRow = {
  player_id?: string;
  stats?: Record<string, number>;
  opponent?: string | null;
  player?: { injury_status?: string | null } | null;
};

function trim(stats: Record<string, number> | undefined): StatMap {
  const out: StatMap = {};
  if (!stats) return out;
  for (const key of KEEP) {
    const value = stats[key];
    if (typeof value === 'number' && value !== 0) out[key] = value;
  }
  return out;
}

async function pull(
  kind: 'stats' | 'projections',
  season: string,
  week: number,
  revalidate: number
): Promise<Record<string, PlayerWeekLine>> {
  const out: Record<string, PlayerWeekLine> = {};
  await Promise.all(
    POSITIONS.map(async (position) => {
      const url = `${BASE}/${kind}/nfl/${season}/${week}?season_type=regular&position[]=${position}&order_by=pts_ppr`;
      try {
        const res = await fetch(url, { next: { revalidate } } as RequestInit);
        if (!res.ok) return;
        const rows: RawRow[] = await res.json();
        if (!Array.isArray(rows)) return;
        for (const row of rows) {
          if (!row?.player_id) continue;
          const stats = trim(row.stats);
          // A player ruled out often has no projection at all, and his injury
          // status is the whole point of reading him, so an injury alone
          // keeps the row.
          const injury = row.player?.injury_status || null;
          if (!Object.keys(stats).length && !injury) continue;
          out[row.player_id] = {
            stats,
            injury,
            opponent: row.opponent ?? null,
          };
        }
      } catch {
        // One position failing leaves the others standing.
      }
    })
  );
  return out;
}

/** What each player has actually done this week. 60 seconds while games run. */
export const getWeekStatLines = (season: string, week: number, live = false) =>
  pull('stats', season, week, live ? 15 : 600);

/** What each player is projected to do this week. */
export const getWeekProjectionLines = (season: string, week: number) =>
  pull('projections', season, week, 900);

const n = (value: number | undefined) => Math.round(value ?? 0);
/** Projected counts keep a decimal: 1.7 touchdowns is the forecast, 2 is not. */
const d = (value: number | undefined) => Number((value ?? 0).toFixed(1));

/**
 * A stat line in the order a broadcast reads it.
 *
 * "21/29, 269 YD, 2 TD, 1 INT" for a passer, then rushing only when there was
 * any. Commas rather than dashes or middle dots, which the house style forbids
 * in copy and which read as minus signs next to numbers anyway.
 */
export function formatStatLine(
  position: string,
  stats: StatMap | undefined,
  projected = false
): string {
  if (!stats) return '';
  const parts: string[] = [];
  // Small counts, touchdowns and the like, keep a decimal on a projection and
  // drop out entirely when the forecast rounds to nothing.
  const count = (value: number | undefined, label: string) => {
    const shown = projected ? d(value) : n(value);
    if (shown) parts.push(`${shown} ${label}`);
  };
  const passing = () => {
    if (!stats.pass_att) return;
    parts.push(`${n(stats.pass_cmp)}/${n(stats.pass_att)}, ${n(stats.pass_yd)} YD`);
    count(stats.pass_td, 'TD');
    count(stats.pass_int, 'INT');
  };
  const rushing = () => {
    // A receiver projected for 0.3 carries reads as "0 CAR, 1 YD": noise.
    if (!stats.rush_att || (projected && stats.rush_att < 1)) return;
    parts.push(`${n(stats.rush_att)} CAR, ${n(stats.rush_yd)} YD`);
    count(stats.rush_td, 'RUSH TD');
  };
  const receiving = () => {
    if (!stats.rec && !stats.rec_tgt) return;
    if (projected && (stats.rec ?? 0) < 0.5) return;
    parts.push(
      projected
        ? `${d(stats.rec)} REC, ${n(stats.rec_yd)} YD`
        : `${n(stats.rec)}/${n(stats.rec_tgt)} REC, ${n(stats.rec_yd)} YD`
    );
    count(stats.rec_td, 'REC TD');
  };

  switch (position) {
    case 'QB':
      passing();
      rushing();
      break;
    case 'RB':
      rushing();
      receiving();
      break;
    case 'WR':
    case 'TE':
      receiving();
      rushing();
      break;
    case 'K':
      if (stats.fga || stats.xpa) {
        parts.push(projected ? `${d(stats.fgm)} FG` : `${n(stats.fgm)}/${n(stats.fga)} FG`);
        parts.push(projected ? `${d(stats.xpm)} XP` : `${n(stats.xpm)}/${n(stats.xpa)} XP`);
        if (stats.fgm_lng) parts.push(`LONG ${n(stats.fgm_lng)}`);
      }
      break;
    case 'DEF':
      count(stats.sack, 'SACK');
      count(stats.int ?? stats.def_int, 'INT');
      count(stats.fum_rec, 'FR');
      count(stats.def_td, 'TD');
      if (stats.pts_allow != null) parts.push(`${n(stats.pts_allow)} PA`);
      break;
  }
  if (!projected) count(stats.fum_lost, 'FUM');
  // Each stat holds together with non-breaking spaces, so a line can only wrap
  // between stats: "46 YD" never leaves "YD" alone on the next line.
  return parts.map((part) => part.replace(/ /g, '\u00a0')).join(', ');
}
