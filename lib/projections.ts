// Sleeper projections. Unofficial and public, no login. Used for win
// probability, playoff odds and previews. Falls back to season scoring
// averages if the endpoint breaks, per Brief Section 3.

const PROJECTIONS = 'https://api.sleeper.com/projections/nfl';
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export type ProjectionMap = Record<string, number>;

type RawProjection = {
  player_id?: string;
  stats?: Record<string, number>;
};

/**
 * Projected fantasy points by player id for one week. Returns an empty map on
 * any failure so callers can fall back to season averages.
 */
export async function getWeekProjections(
  season: string,
  week: number
): Promise<ProjectionMap> {
  const query = POSITIONS.map((p) => `position[]=${p}`).join('&');
  const url = `${PROJECTIONS}/${season}/${week}?season_type=regular&order_by=ppr&${query}`;

  try {
    // No revalidate here on purpose. The response is about 2.8MB, over Next's
    // 2MB data cache ceiling, so asking to cache it logged a failure on every
    // build and cached nothing. The map this returns is a few hundred numbers,
    // so callers cache the result instead of the payload.
    const res = await fetch(url);
    if (!res.ok) return {};
    const rows: RawProjection[] = await res.json();
    if (!Array.isArray(rows)) return {};

    const out: ProjectionMap = {};
    for (const row of rows) {
      const id = row?.player_id;
      const pts = row?.stats?.pts_ppr ?? row?.stats?.pts_half_ppr ?? row?.stats?.pts_std;
      if (id && typeof pts === 'number') out[id] = Number(pts.toFixed(2));
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Season scoring average per roster, the fallback when projections are missing.
 * Weeks with no score are skipped so a bye or a future week does not drag the
 * average down.
 */
export function seasonAverages(
  pointsByWeek: Record<number, Record<number, number>>
): Record<number, number> {
  const totals: Record<number, { sum: number; n: number }> = {};
  for (const week of Object.keys(pointsByWeek)) {
    for (const [rosterId, points] of Object.entries(pointsByWeek[Number(week)])) {
      if (!points) continue;
      const id = Number(rosterId);
      totals[id] ??= { sum: 0, n: 0 };
      totals[id].sum += points;
      totals[id].n += 1;
    }
  }
  const out: Record<number, number> = {};
  for (const [id, { sum, n }] of Object.entries(totals)) {
    out[Number(id)] = n ? Number((sum / n).toFixed(2)) : 0;
  }
  return out;
}

/** Standard deviation of weekly scores, used to shape the odds simulation. */
export function seasonVariance(
  pointsByWeek: Record<number, Record<number, number>>,
  averages: Record<number, number>
): Record<number, number> {
  const spread: Record<number, number[]> = {};
  for (const week of Object.keys(pointsByWeek)) {
    for (const [rosterId, points] of Object.entries(pointsByWeek[Number(week)])) {
      if (!points) continue;
      (spread[Number(rosterId)] ??= []).push(points);
    }
  }
  const out: Record<number, number> = {};
  for (const [id, values] of Object.entries(spread)) {
    const mean = averages[Number(id)] ?? 0;
    // One data point tells us nothing about spread, so assume a league-typical 25.
    if (values.length < 2) {
      out[Number(id)] = 25;
      continue;
    }
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
    out[Number(id)] = Number(Math.sqrt(variance).toFixed(2));
  }
  return out;
}
