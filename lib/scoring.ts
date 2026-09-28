// Fantasy points, scored on this league's rulebook.
//
// Sleeper hands out a precomputed `pts_ppr` on every projection and every stat
// line, and taking it is the obvious thing to do. It is also wrong here, and
// was wrong all season: that field is scored on Sleeper's defaults, and this
// league's defaults are not Sleeper's.
//
// Skill players got away with it. The league is full PPR with standard yardage
// and touchdown values, so a receiver's `pts_ppr` happens to be right. Two
// positions did not:
//
//   DEF   points allowed pays about half the standard rate here (a shutout is
//         5 rather than 10), and the league scores YARDS allowed as well,
//         a whole axis worth +5 to -7 that standard scoring does not have at
//         all.
//   K     50 yard field goals pay through `fgm_50_59` and `fgm_60p`, where
//         standard scoring lumps them into `fgm_50p`.
//
// So points get computed from the raw stat line instead. Both halves of that
// are things the app already fetches: the projection payload carries the stats
// and data/league.json carries all 148 scoring rules.

export type StatLine = Record<string, number>;
export type ScoringSettings = Record<string, number>;

/**
 * Stat keys Sleeper reports both as a total and as its own components.
 *
 * `def_td` is the sum of `def_fum_td` and `pass_int_td`; `st_td` is the sum of
 * the return touchdowns under it. Scoring all of them would pay twice for one
 * touchdown. This league only scores the totals, so the intersection below
 * excludes the components anyway, but naming them here means a future scoring
 * change cannot quietly introduce a double count.
 */
const COMPONENTS_OF: Record<string, string[]> = {
  def_td: ['def_fum_td', 'pass_int_td'],
  st_td: ['def_pr_td', 'def_kr_td', 'pr_td', 'kr_td'],
};

/** Every component key, flattened, for a fast membership test. */
const COMPONENT_KEYS = new Set(Object.values(COMPONENTS_OF).flat());

/**
 * Buckets that roll up into one generic rule when the league does not price
 * the buckets individually.
 *
 * A missed field goal is the live case. The league prices `fgmiss` flat at -1
 * and leaves every `fgmiss_*` bucket at zero, while Sleeper only ever projects
 * the buckets and never the flat total. Summing the buckets into the total is
 * the difference between pricing a miss and ignoring it.
 */
const ROLLUPS: { total: string; buckets: string[] }[] = [
  {
    total: 'fgmiss',
    buckets: [
      'fgmiss_0_19',
      'fgmiss_20_29',
      'fgmiss_30_39',
      'fgmiss_40_49',
      'fgmiss_50_59',
      'fgmiss_50p',
      'fgmiss_60p',
    ],
  },
];

/**
 * Buckets Sleeper reports coarsely and the league prices finely.
 *
 * Sleeper projects made field goals of fifty or more as one `fgm_50p` figure.
 * This league pays 5 for a 50 to 59 and 6 for a 60 plus, and leaves `fgm_50p`
 * at zero, so a straight intersection pays nothing at all for the longest
 * kicks a kicker makes.
 *
 * The coarse figure is attributed to the shorter of the two bands. That is an
 * approximation and it is the conservative one: a 60 yard field goal is rare
 * enough that assuming every long kick is a 50 to 59 is wrong far less often
 * than splitting them would be, and it underpays rather than overpays.
 *
 * `standsInFor` is what keeps it honest, and the engine check is what found
 * it: on a real stat line Sleeper reports both. Aubrey's 60 yarder in week 2
 * came through as `fgm_50p: 1` AND `fgm_60p: 1`, the same kick counted two
 * ways, so paying the coarse figure on top of the bucket paid him twice. The
 * substitution only applies when the fine grained buckets are absent, which
 * is exactly the projection case it exists for.
 */
const SPLITS: { coarse: string; assignTo: string; standsInFor: string[] }[] = [
  { coarse: 'fgm_50p', assignTo: 'fgm_50_59', standsInFor: ['fgm_50_59', 'fgm_60p'] },
];

/** A rule that pays nothing is not a rule. */
const pays = (scoring: ScoringSettings, key: string) => Boolean(scoring[key]);

/**
 * What this stat line is worth under these rules.
 *
 * Only keys the league actually prices are read, so the adp, rank and
 * `pts_ppr` noise Sleeper ships alongside real stats is ignored rather than
 * filtered.
 */
export function scoreStats(stats: StatLine, scoring: ScoringSettings): number {
  let points = 0;

  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (!pays(scoring, key)) continue;
    // A component whose total is also present would be paid twice.
    if (COMPONENT_KEYS.has(key) && typeof stats[totalFor(key)] === 'number') continue;
    points += value * scoring[key];
  }

  for (const { total, buckets } of ROLLUPS) {
    // Only when the league prices the total and none of the buckets, which is
    // what says "these are the same event counted two ways".
    if (!pays(scoring, total)) continue;
    if (buckets.some((b) => pays(scoring, b))) continue;
    if (typeof stats[total] === 'number') continue;
    const count = buckets.reduce((sum, b) => sum + (stats[b] ?? 0), 0);
    points += count * scoring[total];
  }

  for (const { coarse, assignTo, standsInFor } of SPLITS) {
    if (pays(scoring, coarse)) continue; // priced directly, nothing to do
    if (!pays(scoring, assignTo)) continue;
    // The detail is here, so it has already been paid at the right rate.
    if (standsInFor.some((k) => typeof stats[k] === 'number')) continue;
    points += (stats[coarse] ?? 0) * scoring[assignTo];
  }

  return Number(points.toFixed(2));
}

/** The total a component rolls into, or the key itself. */
function totalFor(component: string): string {
  for (const [total, parts] of Object.entries(COMPONENTS_OF)) {
    if (parts.includes(component)) return total;
  }
  return component;
}

/**
 * Categories this league pays for that Sleeper never projects.
 *
 * Reported rather than silently absorbed, because the honest thing to say
 * about a projection is which parts of it are missing. All three are special
 * teams events credited to a defence, worth 1, 1 and 6, and between them they
 * are a fraction of a point on a typical week.
 */
export const UNPROJECTED = ['def_st_ff', 'def_st_fum_rec', 'def_st_td'] as const;
