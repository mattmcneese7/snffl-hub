import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { getNflScoreboard } from '@/lib/espn';
import { toFeature } from '@/lib/feature';
import { getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { embedClipsForWeek } from '../../lib/embed-clips';
import { nflTeamName } from '../../kit/nflTeams';
import { positionName } from '../../kit/positions';

/**
 * Everything The Drop shows, from real data only: how much of the week is
 * played, what is live, the week's top and bottom scores, the closest game,
 * your game, and a live NFL clock. Shared by every treatment on the bench so
 * they are judged on the same numbers.
 */
export type DropSide = { rosterId: number; team: string; manager: string; avatar: string | null; points: number; toPlay: number; winProb: number | null };
export type DropData = {
  week: number;
  day: string;
  live: boolean;
  clock: string | null;
  gamesLive: number;
  toPlay: number;
  /** Share of the week's starters whose games are over, 0 to 1. */
  played: number;
  top: DropSide;
  low: DropSide;
  closest: { matchupId: number; away: DropSide; home: DropSide; gap: number };
  yours: { matchupId: number; you: DropSide; them: DropSide } | null;
  /** Every matchup, for the seven drops. */
  games: { matchupId: number; inPlay: boolean; final: boolean; away: DropSide; home: DropSide }[];
  /** The latest clip of a league starter: the moment. */
  moment: { videoId: string; still: string; title: string; player: string; position: string; team: string; points: number; owner: string; ownerTeam: string } | null;
};

export async function dropData(): Promise<DropData | null> {
  const week = await scoredWeek();
  const [raw, ctx, nfl, jar] = await Promise.all([getWeekGames(week), getMatchupContext(week), getNflScoreboard().catch(() => []), cookies()]);
  const games = markInPlay(raw, ctx.nfl);
  if (!games.length) return null;
  const models = winProbabilities(games, ctx);
  const name = (id: number, fallback: string) => firstNameOf(id) ?? fallback;

  let done = 0;
  let all = 0;
  const shaped = games.map((g) => {
    const f = toFeature(g, '', models.get(g.matchupId));
    const side = (x: typeof f.away): DropSide => {
      done += x.done;
      all += x.done + x.inPlay + x.yetToPlay;
      return {
        rosterId: x.rosterId,
        team: x.teamName,
        manager: name(x.rosterId, x.manager),
        avatar: teamByRoster(x.rosterId)?.avatarUrl ?? null,
        points: x.points,
        toPlay: x.yetToPlay + x.inPlay,
        winProb: x.winProb,
      };
    };
    return { matchupId: g.matchupId, inPlay: Boolean(g.inPlay), final: g.status === 'final', away: side(f.away), home: side(f.home) };
  });

  const sides = shaped.flatMap((g) => [g.away, g.home]);
  const top = sides.reduce((a, b) => (b.points > a.points ? b : a));
  const low = sides.reduce((a, b) => (b.points < a.points ? b : a));
  const closestGame = shaped.reduce((a, b) => (Math.abs(b.away.points - b.home.points) < Math.abs(a.away.points - a.home.points) ? b : a));
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const yourGame = mine != null ? shaped.find((g) => g.away.rosterId === mine || g.home.rosterId === mine) : undefined;
  const liveNfl = nfl.filter((g) => g.state === 'in');

  // The moment: the newest clip naming a player who is starting this week.
  const starters = new Map<string, { slot: (typeof games)[number]['away']['lineup'][number]; rosterId: number }>();
  for (const g of games) for (const side of [g.away, g.home]) for (const p of side.lineup) starters.set(p.id, { slot: p, rosterId: side.rosterId });
  const clips = await embedClipsForWeek(week).catch(() => []);
  const newest = [...clips]
    .filter((c) => c.playerIds.some((id) => starters.has(id)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
  const who = newest ? starters.get(newest.playerIds.find((id) => starters.has(id))!) : undefined;
  const ownerSide = who ? shaped.flatMap((g) => [g.away, g.home]).find((x) => x.rosterId === who.rosterId) : undefined;

  return {
    week,
    day: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Chicago' }).format(new Date()),
    live: liveNfl.length > 0 || shaped.some((g) => g.inPlay),
    clock: liveNfl[0] ? `${liveNfl[0].away.abbr} at ${liveNfl[0].home.abbr}, ${liveNfl[0].status}` : null,
    gamesLive: shaped.filter((g) => g.inPlay).length,
    toPlay: sides.reduce((n, s) => n + s.toPlay, 0),
    played: all ? done / all : 0,
    top,
    low,
    closest: { matchupId: closestGame.matchupId, away: closestGame.away, home: closestGame.home, gap: Math.abs(closestGame.away.points - closestGame.home.points) },
    games: shaped,
    moment:
      newest && who && ownerSide
        ? {
            videoId: newest.videoId,
            still: newest.still,
            title: newest.title,
            player: who.slot.name,
            position: positionName(who.slot.position),
            team: nflTeamName(who.slot.team),
            points: who.slot.points,
            owner: ownerSide.manager,
            ownerTeam: ownerSide.team,
          }
        : null,
    yours: yourGame
      ? yourGame.away.rosterId === mine
        ? { matchupId: yourGame.matchupId, you: yourGame.away, them: yourGame.home }
        : { matchupId: yourGame.matchupId, you: yourGame.home, them: yourGame.away }
      : null,
  };
}
