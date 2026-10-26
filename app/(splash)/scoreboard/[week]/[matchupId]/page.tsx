import type { Metadata } from 'next';
import { statWords } from '../../../kit/statWords';
import { cookies } from 'next/headers';
import Link from 'next/link';
import LiveRefresh from '@/components/LiveRefresh';
import { toFeature } from '@/lib/feature';
import { getWeekGames } from '@/lib/league';
import { buildLiveMatchup, getMatchupContext, markInPlay, type LiveSide } from '@/lib/matchup-live';
import { swamiRead } from '@/lib/swami';
import type { LineupSlot } from '@/lib/types';
import Shell from '../../../kit/Shell';
import { nflTeamName } from '../../../kit/nflTeams';
import PageHead from '../../../kit/PageHead';
import Squirt from '../../../home/Squirt';
import Widget from '../../../home/Widget';
import { ClipRail } from '../../../home/Widgets';
import w from '../../../home/widgets.module.css';
import { embedClipsForPlayers } from '../../../lib/embed-clips';
import { bookFrom, mainBook, withBook } from '../../../lib/odds-books';
import Lineups from '../../parts/Lineups';
import { loreTable } from '../../parts/lore';
import ScoreCard from '../../parts/ScoreCard';
import { nameOf, pts, SleeperPill } from '../../parts/shared';
import Slate from '../../parts/Slate';
import SwamiPanel from '../../parts/SwamiPanel';
import s from '../../sb.module.css';
import { weekParam } from '../../../kit/weekParam';

export const metadata: Metadata = { title: { absolute: 'Matchup, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * One matchup, v2's matchup page in widgets: the score card, the way into
 * Sleeper while there is still a lineup to set, the top scorer so far,
 * the Swami's read on the game, both lineups slot by slot, the NFL games
 * these two have starters in, and the clips of their players this week.
 */
export default async function MatchupPage({ params }: { params: Promise<{ week: string; matchupId: string }> }) {
  const { week: rawWeek, matchupId: rawId } = await params;
  const week = weekParam(rawWeek);
  const matchupId = Number(rawId);

  const [rawGames, espnCtx, lore, jar] = await Promise.all([
    getWeekGames(week).catch(() => []),
    getMatchupContext(week).catch(() => ({ nfl: [], lines: {}, stats: {}, projections: {} })),
    loreTable(),
    cookies(),
  ]);
  // Every line on the page from the book this device picked; DraftKings from
  // ESPN stands in, labeled, where that book has none.
  const ctx = await withBook(espnCtx, bookFrom(jar));
  const games = markInPlay(rawGames, ctx.nfl);
  const found = games.find((g) => g.matchupId === matchupId);
  // Full names everywhere, never "D. Maye": the Swami's sentence is built
  // from each player's short name, so short is the full name here.
  const full = (p: LineupSlot): LineupSlot => ({ ...p, short: p.name });
  const game = found
    ? {
        ...found,
        away: { ...found.away, lineup: found.away.lineup.map(full), bench: found.away.bench?.map(full) },
        home: { ...found.home, lineup: found.home.lineup.map(full), bench: found.home.bench?.map(full) },
      }
    : undefined;
  const back = (
    <Link href={`/scoreboard/${week}`} className={s.back}>
      &lsaquo; Scoreboard
    </Link>
  );

  if (!game) {
    return (
      <Shell active="scoreboard">
        <PageHead title="Matchup">
          {back}
        </PageHead>
        <div className={w.grid}>
          <Widget size="m" icon="helmet" title="Nothing here">
            <div className={s.nudge}>
              <Squirt mood="sleep" size={56} />
              <p className={s.empty}>Sleeper has no game {rawId} in week {week}.</p>
            </div>
          </Widget>
        </div>
      </Shell>
    );
  }

  const live = buildLiveMatchup(game, ctx);
  const awayName = nameOf(game.away.rosterId, game.away.manager);
  const homeName = nameOf(game.home.rosterId, game.home.manager);

  // The Swami speaks in first names, like every other line on the page.
  const named = (side: LiveSide): LiveSide => ({ ...side, manager: nameOf(side.rosterId, side.manager) });
  const read = swamiRead({ ...live, away: named(live.away), home: named(live.home) });

  // The top scorer in the matchup so far, either side.
  const scorers = [live.away, live.home].flatMap((side) => side.lineup.map((p) => ({ p, side })));
  const top = scorers.length ? scorers.reduce((a, b) => (b.p.points > a.p.points ? b : a)) : null;

  // Only the NFL games this matchup has a starter in.
  const inGames = new Set([...live.away.lineup, ...live.home.lineup].map((p) => p.nfl?.game.id).filter(Boolean));
  const relevant = ctx.nfl.filter((g) => inGames.has(g.id));
  const lineBook = mainBook(relevant.map((g) => ctx.lines[g.id]));
  const startersInGame: Record<string, number> = {};
  for (const p of [...live.away.lineup, ...live.home.lineup]) if (p.team) startersInGame[p.team] = (startersInGame[p.team] ?? 0) + 1;

  // This matchup's players on tape, starters and bench, tagged to their manager.
  const owner = new Map<string, { name: string; started: boolean }>();
  for (const side of [game.away, game.home]) {
    for (const p of side.lineup) owner.set(p.id, { name: nameOf(side.rosterId, side.manager), started: true });
    for (const p of side.bench ?? []) owner.set(p.id, { name: nameOf(side.rosterId, side.manager), started: false });
  }
  const clips = await embedClipsForPlayers(week, [...owner.keys()]).catch(() => []);

  return (
    <Shell active="scoreboard">
      <LiveRefresh live={ctx.nfl.some((g) => g.state === 'in')} week={week} />
      <div className={w.grid}>
        <ScoreCard
          f={toFeature(game, '', live)}
          title={`Week ${week}`}
          h1
          back={back}
          big
          lore={lore}
          foot={
            game.status !== 'final' ? (
              <div className={s.pills}>
                {/* Sleeper knows who is signed in, so these open on whoever taps them. */}
                <SleeperPill action="lineup" label="Set lineup" />
                <SleeperPill action="matchup" label="Matchup" />
              </div>
            ) : null
          }
        />

        <Widget size="m" icon="jersey" title="Top scorer">
          {top && top.p.points > 0 ? (
            <Link href={`/players/${top.p.id}`} className={s.top}>
              <span className={s.topFace}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={top.p.headshot} alt="" loading="lazy" />
              </span>
              <span className={s.topWho}>
                <span className={s.topName}>{top.p.name}</span>
                <span className={s.sub}>
                  {top.p.slot !== top.p.position ? `${top.p.slot}, ` : ''}
                  {top.p.position}
                  {top.p.team ? `, ${nflTeamName(top.p.team)}` : ''}
                </span>
                <span className={s.pairs}>
                  <span className={s.topLine}>
                    Team | {top.side.team}
                  </span>
                </span>
                {top.p.statLine ? <span className={s.topLine}>{statWords(top.p.statLine)}</span> : null}
              </span>
              <span className={s.topPts}>{pts(top.p.points)}</span>
            </Link>
          ) : (
            <p className={s.empty}>No points scored yet.</p>
          )}
        </Widget>

        <SwamiPanel read={read} />

        <section className={`${w.widget} ${w.l} ${s.tick}`}>
          <Lineups matchup={live} names={[awayName, homeName]} lineBook={lineBook} />
          <span className={s.via}>Sources | Sleeper, DraftSharks{lineBook ? `, ${lineBook}` : ''}</span>
        </section>

        <Widget size="m" icon="tv" title="Their games">
          {relevant.length ? (
            <Slate games={relevant} lines={ctx.lines} startersByTeam={startersInGame} lineBook={lineBook} />
          ) : (
            <p className={s.empty}>No starters on ESPN&rsquo;s slate.</p>
          )}
          {relevant.length ? <span className={s.via}>Sources | {lineBook ? `ESPN, ${lineBook}` : 'ESPN'}</span> : null}
        </Widget>

        <ClipRail title="This game, on tape" icon="helmet" clips={clips} ownerOf={(id) => owner.get(id) ?? null} size="m" />
      </div>
    </Shell>
  );
}
