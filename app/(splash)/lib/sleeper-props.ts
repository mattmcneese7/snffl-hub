// Sleeper's own player props, the lines on Sleeper Picks. The endpoint is
// public but not documented, so everything here is defensive: it never
// throws, and a shape it does not recognize is simply left out.
//
// One read covers every sport on Sleeper; only active NFL lines are kept,
// keyed by Sleeper player id, the same ids this app uses everywhere.

const ENDPOINT = 'https://api.sleeper.app/lines/available?dynamic=true&include_preriod_lines=false';
/** Seconds a read is reused. */
const REVALIDATE = 300;

export type SleeperProp = {
  /** Sleeper's wager type, "receiving_yards". */
  wager: string;
  /** In plain English, "Receiving yards". */
  label: string;
  /** The number to go over or under. */
  line: number;
  /** What a pick pays, as Sleeper prints it: 1.81 is 1.81x. */
  over: number | null;
  under: number | null;
  /** When Sleeper last moved this line, ms since epoch. */
  updated: number | null;
};

/** Sleeper's wager types in plain English, in the order a page lists them. */
const WAGERS: [string, string][] = [
  ['passing_yards', 'Passing yards'],
  ['passing_touchdowns', 'Passing touchdowns'],
  ['pass_completions', 'Completions'],
  ['passing_attempts', 'Pass attempts'],
  ['interceptions', 'Interceptions thrown'],
  ['longest_passing_completion', 'Longest completion'],
  ['passing_and_rushing_yards', 'Passing and rushing yards'],
  ['rushing_yards', 'Rushing yards'],
  ['rushing_attempts', 'Rushing attempts'],
  ['longest_rush', 'Longest rush'],
  ['rushing_and_receiving_yards', 'Rushing and receiving yards'],
  ['receptions', 'Receptions'],
  ['receiving_yards', 'Receiving yards'],
  ['longest_reception', 'Longest reception'],
  ['anytime_touchdowns', 'Touchdowns'],
  ['field_goal_made', 'Field goals made'],
  ['extra_point_made', 'Extra points made'],
  ['kicking_points', 'Kicking points'],
  ['tackles', 'Solo tackles'],
  ['assists', 'Assisted tackles'],
  ['tackles_and_assists', 'Total tackles'],
  ['sacks', 'Sacks'],
];
const LABEL = new Map(WAGERS);
const ORDER = new Map(WAGERS.map(([k], i) => [k, i]));

/** A wager type Sleeper adds later, spelled out from its key: "fantasy_points" is "Fantasy points". */
const labelOf = (wager: string) => {
  const known = LABEL.get(wager);
  if (known) return known;
  const words = wager.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

type RawOption = {
  status?: string;
  sport?: string;
  subject_id?: string | number;
  subject_type?: string;
  wager_type?: string;
  outcome?: string;
  outcome_value?: number | string;
  payout_multiplier?: number | string;
  subject_position?: string | null;
};
type RawMarket = { status?: string; sport?: string; updated_at?: number; options?: RawOption[] };

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

let memo: { at: number; data: Record<string, SleeperProp[]> } | null = null;

/** Every active NFL prop on Sleeper, by player id. Empty when Sleeper has none or the read fails. */
export async function readSleeperProps(): Promise<Record<string, SleeperProp[]>> {
  if (memo && Date.now() - memo.at < REVALIDATE * 1000) return memo.data;
  const data: Record<string, SleeperProp[]> = {};
  try {
    // A busy Sunday can run past the fetch cache's 2 MB, so the parsed
    // result is also kept here, which is all the pages need.
    const res = await fetch(ENDPOINT, { next: { revalidate: REVALIDATE } } as RequestInit);
    if (!res.ok) return memo?.data ?? {};
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return memo?.data ?? {};
    for (const m of raw as RawMarket[]) {
      if (!m || m.sport !== 'nfl' || m.status !== 'active' || !Array.isArray(m.options)) continue;
      const opts = m.options.filter((o) => o && o.sport === 'nfl' && o.status === 'active' && o.subject_type === 'player');
      const over = opts.find((o) => o.outcome === 'over');
      const under = opts.find((o) => o.outcome === 'under');
      const first = over ?? under;
      if (!first?.wager_type || first.subject_id == null) continue;
      const line = num(first.outcome_value);
      if (line == null) continue;
      const id = String(first.subject_id);
      (data[id] ??= []).push({
        wager: first.wager_type,
        // A defender's interceptions are made, not thrown.
        label: first.wager_type === 'interceptions' && first.subject_position !== 'QB' ? 'Interceptions' : labelOf(first.wager_type),
        line,
        over: num(over?.payout_multiplier),
        under: num(under?.payout_multiplier),
        updated: num(m.updated_at),
      });
    }
    // One line a wager, the latest, in case Sleeper lists a wager twice.
    for (const [id, list] of Object.entries(data)) {
      const latest = new Map<string, SleeperProp>();
      for (const p of list) if (!latest.has(p.wager) || (p.updated ?? 0) > (latest.get(p.wager)!.updated ?? 0)) latest.set(p.wager, p);
      data[id] = [...latest.values()];
    }
    for (const list of Object.values(data)) list.sort((a, b) => (ORDER.get(a.wager) ?? 99) - (ORDER.get(b.wager) ?? 99) || a.label.localeCompare(b.label));
  } catch {
    return memo?.data ?? {};
  }
  memo = { at: Date.now(), data };
  return data;
}

/** One player's props, in reading order. */
export async function sleeperPropsFor(playerId: string): Promise<SleeperProp[]> {
  return (await readSleeperProps())[playerId] ?? [];
}
