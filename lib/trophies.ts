// Weekly hardware, computed from final scores only. A live week has leaders,
// not winners, so nothing is awarded until every game in it is final.

import { getWeekGames, scoredWeek } from './league.ts';
import { getPostseason } from './postseason.ts';
import { TROPHY_NAMES, type TrophyKey } from './trophy-names.ts';

export { TROPHY_NAMES, type TrophyKey };

export type Award = {
  kind: TrophyKey;
  week: number | null;
  rosterId: number;
  /** The number that won it: a score, a margin, bench points. */
  value: number;
  /** "123.96 to 122.96" and the like, for captions. */
  detail: string;
};

const WEEKLY: TrophyKey[] = ['motw', 'shart', 'blowout', 'squeaker', 'heartbreaker', 'lucky', 'bench'];

/** Every award for one finished week, or [] while it is still being played. */
export async function awardsForWeek(week: number): Promise<Award[]> {
  const games = await getWeekGames(week);
  if (!games.length || games.some((game) => game.status !== 'final')) return [];

  const sides = games.flatMap((game) => {
    const [a, b] = [game.away, game.home];
    return [
      { side: a, opponent: b, won: a.points > b.points },
      { side: b, opponent: a, won: b.points > a.points },
    ];
  });
  const fmt = (n: number) => n.toFixed(2);
  const out: Award[] = [];

  const high = sides.reduce((x, y) => (y.side.points > x.side.points ? y : x));
  out.push({ kind: 'motw', week, rosterId: high.side.rosterId, value: high.side.points, detail: `${fmt(high.side.points)} points` });

  const low = sides.reduce((x, y) => (y.side.points < x.side.points ? y : x));
  out.push({ kind: 'shart', week, rosterId: low.side.rosterId, value: low.side.points, detail: `${fmt(low.side.points)} points` });

  const winners = sides.filter((s) => s.won);
  if (winners.length) {
    const margin = (s: (typeof sides)[number]) => s.side.points - s.opponent.points;
    const blow = winners.reduce((x, y) => (margin(y) > margin(x) ? y : x));
    out.push({ kind: 'blowout', week, rosterId: blow.side.rosterId, value: margin(blow), detail: `won by ${fmt(margin(blow))}` });
    const squeak = winners.reduce((x, y) => (margin(y) < margin(x) ? y : x));
    out.push({ kind: 'squeaker', week, rosterId: squeak.side.rosterId, value: margin(squeak), detail: `won by ${fmt(margin(squeak))}` });
    const lucky = winners.reduce((x, y) => (y.side.points < x.side.points ? y : x));
    out.push({ kind: 'lucky', week, rosterId: lucky.side.rosterId, value: lucky.side.points, detail: `won with ${fmt(lucky.side.points)}` });
  }
  const losers = sides.filter((s) => !s.won);
  if (losers.length) {
    const heart = losers.reduce((x, y) => (y.side.points > x.side.points ? y : x));
    out.push({ kind: 'heartbreaker', week, rosterId: heart.side.rosterId, value: heart.side.points, detail: `lost with ${fmt(heart.side.points)}` });
  }
  const benchOf = (s: (typeof sides)[number]) => (s.side.bench ?? []).reduce((sum, p) => sum + p.points, 0);
  const rot = sides.reduce((x, y) => (benchOf(y) > benchOf(x) ? y : x));
  if (benchOf(rot) > 0) {
    out.push({ kind: 'bench', week, rosterId: rot.side.rosterId, value: benchOf(rot), detail: `${fmt(benchOf(rot))} on the bench` });
  }
  return out;
}

export type TrophyBoard = {
  /** Every award handed out so far, newest week first. */
  all: Award[];
  /** The most recent finished week, and what it handed out. */
  latestWeek: number | null;
  latest: Award[];
  /** Roster id to the awards it currently holds from the latest week. */
  holders: Record<number, TrophyKey[]>;
};

export async function getTrophyBoard(): Promise<TrophyBoard> {
  const current = await scoredWeek();
  const weeks = Array.from({ length: current }, (_, i) => i + 1);
  const perWeek = await Promise.all(weeks.map((week) => awardsForWeek(week)));
  const all = perWeek.flat().sort((a, b) => (b.week ?? 99) - (a.week ?? 99));

  // Season hardware, once the postseason has decided it.
  try {
    const post = await getPostseason();
    if (post.championRosterId != null) {
      all.unshift({ kind: 'champion', week: null, rosterId: post.championRosterId, value: 0, detail: 'League champion' });
    }
    if (post.shartRosterId != null) {
      all.unshift({ kind: 'plunger', week: null, rosterId: post.shartRosterId, value: 0, detail: 'Lost the Shart Bowl' });
    }
  } catch {
    // No bracket yet is simply no season hardware yet.
  }

  const finished = perWeek.map((awards, i) => (awards.length ? weeks[i] : null)).filter((w): w is number => w != null);
  const latestWeek = finished.length ? finished[finished.length - 1] : null;
  const latest = latestWeek ? perWeek[latestWeek - 1] : [];
  const holders: Record<number, TrophyKey[]> = {};
  for (const award of latest) (holders[award.rosterId] ??= []).push(award.kind);
  for (const award of all.filter((a) => a.week == null)) (holders[award.rosterId] ??= []).push(award.kind);

  return { all, latestWeek, latest, holders };
}

export const weeklyKinds = WEEKLY;
