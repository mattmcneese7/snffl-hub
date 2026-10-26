import { firstNameOf } from '@/config/managers';
import { getSeasonResults, getWeekGames, league, scoredWeek, teamByRoster, teams } from '@/lib/league';
import { readIssue } from '@/lib/rag';
import type { GameSide, LineupSlot } from '@/lib/types';
import { weekStory, type StorySlide } from '@/lib/week-story';
import type { Beat, Person, Player, Side, TableRow } from './types';

/**
 * The last week whose games are all final. During play the league is in a
 * week with no result yet, so the story is the one before it.
 */
export async function lastCompletedWeek(): Promise<number> {
  const week = await scoredWeek();
  const games = await getWeekGames(week).catch(() => []);
  const done = games.length > 0 && games.every((g) => g.status === 'final');
  return Math.max(1, done ? week : week - 1);
}

export const personOf = (rosterId: number): Person => {
  const team = teamByRoster(rosterId);
  return {
    rosterId,
    first: firstNameOf(rosterId) ?? team?.manager ?? `Roster ${rosterId}`,
    team: (team?.teamName ?? `Roster ${rosterId}`).trim(),
    avatar: team?.avatarUrl ?? null,
  };
};

const playerOf = (slot: LineupSlot): Player => ({
  id: slot.id,
  name: slot.name,
  headshot: slot.headshot,
  position: slot.position,
  nflTeam: slot.team ?? null,
  points: slot.points,
});

/** Which starting slots a position can fill. */
const FLEX: Record<string, string[]> = {
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
};
const fits = (slot: string, position: string) => slot === position || (FLEX[slot]?.includes(position) ?? false);

/** Rag copy goes in only as written, and only if it already meets the house rules. */
const clean = (text: string) => !/\u2014|-{2}/.test(text);

const isFile = (video: string) => /^https?:\/\//i.test(video) && !/youtu\.?be/i.test(video);

/**
 * Build the week's beats: the story the app already tells (lib/week-story)
 * plus what the scoreboard says on top of it. An empty list means the week
 * is not finished, and the viewer says so instead of guessing.
 */
export async function buildBeats(week: number): Promise<Beat[]> {
  const [slides, games, results] = await Promise.all([
    weekStory(week).catch((): StorySlide[] => []),
    getWeekGames(week).catch(() => []),
    getSeasonResults(week).catch(() => []),
  ]);
  if (!slides.length || !games.length) return [];

  const final = games.filter((g) => g.status === 'final');
  const sides: { side: GameSide; opp: GameSide; won: boolean; margin: number }[] = final.flatMap((g) => [
    { side: g.home, opp: g.away, won: g.winner === g.home.rosterId, margin: g.margin },
    { side: g.away, opp: g.home, won: g.winner === g.away.rosterId, margin: g.margin },
  ]);
  const gameOf = (rosterId: number) => sides.find((s) => s.side.rosterId === rosterId) ?? null;
  const beats: Beat[] = [];

  // The best starter in the league this week, used by its own beat and kept
  // off the manager of the week beat so the same name is not told twice.
  const starters = sides.flatMap((s) => s.side.lineup.map((slot) => ({ slot, s })));
  const top = [...starters].sort((a, b) => b.slot.points - a.slot.points)[0] ?? null;

  const intro = slides.find((s): s is Extract<StorySlide, { kind: 'intro' }> => s.kind === 'intro');
  const motw = slides.find((s): s is Extract<StorySlide, { kind: 'motw' }> => s.kind === 'motw');
  const shart = slides.find((s): s is Extract<StorySlide, { kind: 'shart' }> => s.kind === 'shart');
  const play = slides.find((s): s is Extract<StorySlide, { kind: 'play' }> => s.kind === 'play');
  const shakeup = slides.find((s): s is Extract<StorySlide, { kind: 'shakeup' }> => s.kind === 'shakeup');

  const total = sides.reduce((sum, s) => sum + s.side.points, 0);
  const high = [...sides].sort((a, b) => b.side.points - a.side.points)[0];
  beats.push({
    kind: 'cover',
    games: final.length,
    total: Number(total.toFixed(2)),
    high: high?.side.points ?? 0,
    highBy: high ? personOf(high.side.rosterId) : null,
    image: intro?.art.still ?? null,
  });

  const starOf = (rosterId: number): Player | null => {
    const g = gameOf(rosterId);
    const best = g ? [...g.side.lineup].sort((a, b) => b.points - a.points)[0] : null;
    return best ? playerOf(best) : null;
  };

  if (motw) {
    const g = gameOf(motw.rosterId);
    const star = starOf(motw.rosterId);
    beats.push({
      kind: 'motw',
      who: personOf(motw.rosterId),
      value: motw.value,
      image: motw.art.still,
      star: star && top && star.id === top.slot.id ? null : star,
      opponent: g ? personOf(g.opp.rosterId) : null,
      margin: g ? g.margin : null,
      won: g?.won ?? false,
    });
  }

  if (top) {
    beats.push({ kind: 'topPlayer', player: playerOf(top.slot), who: personOf(top.s.side.rosterId), won: top.s.won });
  }

  if (shart) {
    const g = gameOf(shart.rosterId);
    beats.push({
      kind: 'shart',
      who: personOf(shart.rosterId),
      value: shart.value,
      image: shart.art.still,
      star: starOf(shart.rosterId),
      opponent: g ? personOf(g.opp.rosterId) : null,
      margin: g ? g.margin : null,
    });
  }

  // Closest and biggest margins, from final games only.
  const sideOf = (s: GameSide): Side => ({ who: personOf(s.rosterId), points: s.points });
  const split = (g: (typeof final)[number]) => {
    const homeWon = g.winner === g.home.rosterId;
    return { winner: sideOf(homeWon ? g.home : g.away), loser: sideOf(homeWon ? g.away : g.home) };
  };
  const byMargin = [...final].sort((a, b) => a.margin - b.margin);
  const closest = byMargin[0];
  const widest = byMargin[byMargin.length - 1];
  if (closest) beats.push({ kind: 'close', ...split(closest), margin: closest.margin });
  if (widest && widest !== closest) beats.push({ kind: 'blowout', ...split(widest), margin: widest.margin });

  // The bench miss: the highest scoring benched player who outscored the
  // weakest starter in a slot he could have filled.
  type Miss = { s: (typeof sides)[number]; benched: LineupSlot; started: LineupSlot };
  let miss: Miss | null = null;
  for (const s of sides) {
    for (const b of s.side.bench ?? []) {
      if (!(b.points > 0) || !b.position) continue;
      const beaten = s.side.lineup.filter((st) => fits(st.slot, b.position) && st.points < b.points);
      if (!beaten.length) continue;
      const worst = [...beaten].sort((x, y) => x.points - y.points)[0];
      const better =
        !miss ||
        b.points > miss.benched.points ||
        (b.points === miss.benched.points && b.points - worst.points > miss.benched.points - miss.started.points);
      if (better) miss = { s, benched: b, started: worst };
    }
  }
  if (miss) {
    const swing = Number((miss.benched.points - miss.started.points).toFixed(2));
    beats.push({
      kind: 'bench',
      who: personOf(miss.s.side.rosterId),
      benched: playerOf(miss.benched),
      started: { ...playerOf(miss.started), slot: miss.started.slot },
      swing,
      result: miss.s.won ? 'won' : swing > miss.s.margin ? 'flips' : 'lost',
      margin: miss.s.margin,
    });
  }

  if (play) {
    const owner = play.manager ? teams.find((t) => t.manager === play.manager) : undefined;
    beats.push({
      kind: 'play',
      headline: play.headline,
      image: play.still ?? play.art.still,
      video: isFile(play.video) ? play.video : null,
      points: play.points,
      first: owner ? personOf(owner.rosterId).first : play.manager,
    });
  }

  if (shakeup?.movers.length) {
    beats.push({
      kind: 'movers',
      movers: shakeup.movers.map((m) => ({ who: personOf(m.rosterId), from: m.from, to: m.to })),
    });
  }

  // The playoff line after this week, rebuilt from final results only, in
  // the order the standings sort: wins, then points.
  const tally = new Map<number, { wins: number; losses: number; points: number }>();
  for (const t of teams) tally.set(t.rosterId, { wins: 0, losses: 0, points: 0 });
  for (const row of results) {
    const t = tally.get(row.rosterId);
    if (!t || row.week > week) continue;
    if (row.won) t.wins += 1;
    else t.losses += 1;
    t.points += row.points;
  }
  const table: TableRow[] = [...tally.entries()]
    .sort((a, b) => b[1].wins - a[1].wins || b[1].points - a[1].points)
    .map(([rosterId, t], i) => ({ who: personOf(rosterId), seed: i + 1, wins: t.wins, losses: t.losses, points: Number(t.points.toFixed(2)) }));
  const seeds = league.playoffTeams;
  if (table.length > seeds + 1 && results.length) {
    beats.push({
      kind: 'line',
      seeds,
      inside: table.slice(Math.max(0, seeds - 2), seeds),
      outside: table.slice(seeds, seeds + 2),
    });
  }

  // The Rag, only where the issue went out, quoted as published.
  const issue = readIssue(week);
  const lead =
    issue?.articles.find((a) => a.id === 'shart' && !a.retracted && clean(a.headline + a.deck)) ??
    issue?.articles.find((a) => !a.retracted && clean(a.headline + a.deck));
  if (lead) beats.push({ kind: 'rag', category: lead.category, headline: lead.headline, deck: lead.deck });

  return beats;
}

export const ragPublished = (week: number) => readIssue(week) != null;
