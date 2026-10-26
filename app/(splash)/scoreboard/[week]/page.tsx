import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import LiveRefresh from '@/components/LiveRefresh';
import { toFeature } from '@/lib/feature';
import { getWeekGames, league } from '@/lib/league';
import { getMatchupContext, markInPlay, outlookOf, startersByNflTeam, winProbabilities } from '@/lib/matchup-live';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { leagueVerdicts, oracleFor } from '@/lib/squirt-says';
import type { LineupSlot } from '@/lib/types';
import Shell from '../../kit/Shell';
import PageHead from '../../kit/PageHead';
import WeekPicker from '../../kit/WeekPicker';
import { PillLink } from '../../home/Glass';
import Squirt from '../../home/Squirt';
import Widget, { WidgetHead } from '../../home/Widget';
import w from '../../home/widgets.module.css';
import { bookFrom, mainBook, slateLines } from '../../lib/odds-books';
import { loreTable } from '../parts/lore';
import MatchTile from '../parts/MatchTile';
import ScoreCard from '../parts/ScoreCard';
import { SleeperPill } from '../parts/shared';
import Slate from '../parts/Slate';
import Verdicts from '../parts/Verdicts';
import s from '../sb.module.css';
import { weekParam } from '../../kit/weekParam';

export const metadata: Metadata = { title: { absolute: 'Scoreboard, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The Scoreboard: v2's week page in widgets. Your game first, because the
 * question a Sunday opens with is how am I doing; then Squirt's read on every
 * lineup; then every matchup in the league; then the NFL slate those lineups
 * are playing in. Every number comes from the same calls v2 makes, and the
 * page refreshes itself, with scores ticking from Sleeper, while a ball is in
 * play.
 */
export default async function ScoreboardWeek({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = weekParam(raw);

  const [rawGames, ctx, oracle, jar, lore] = await Promise.all([
    getWeekGames(week).catch(() => []),
    getMatchupContext(week).catch(() => ({ nfl: [], lines: {}, stats: {}, projections: {} })),
    // Squirt reads lineups against today's injury report, so his verdicts
    // only mean anything for the week being played now.
    week === league.state.week ? oracleFor(week).catch(() => null) : Promise.resolve(null),
    cookies(),
    loreTable(),
  ]);
  // Sleeper calls a matchup live all week once anyone scores; whether a
  // starter is on the field right now is what the live drop follows.
  const games = markInPlay(rawGames, ctx.nfl);
  const models = winProbabilities(games, ctx);
  // The slate's lines from the book this device picked; DraftKings from ESPN
  // stands in, labeled, where that book has none.
  const lines = await slateLines(ctx.nfl, ctx.lines, bookFrom(jar));
  const lineBook = mainBook(Object.values(lines));
  // Full names in every saying, never "D. Maye": the sayings are built from
  // each player's short name, so short is the full name here.
  const full = <T extends { name: string }>(p: T): T => ({ ...p, short: p.name });
  const verdicts = oracle && games.some((g) => g.status !== 'final')
    ? leagueVerdicts(
        oracle.sides.map(({ side, manager }) => ({ side: { ...side, lineup: side.lineup.map(full), bench: side.bench?.map(full) }, manager })),
        oracle.input,
      )
    : [];
  // ESPN, not the game status, decides whether to poll: a ball in play.
  const live = ctx.nfl.some((g) => g.state === 'in');

  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const isMine = (g: (typeof games)[number]) => mine != null && (g.away.rosterId === mine || g.home.rosterId === mine);
  const myGame = games.find(isMine);
  // Your game has its own card above, so the list is everyone else's.
  const others = games.filter((g) => !isMine(g));

  // The closest game still being played gets Squirt, sweating it out.
  const inPlay = games.filter((g) => g.inPlay);
  const closest = inPlay.length ? inPlay.reduce((a, b) => (b.margin < a.margin ? b : a)) : null;

  // Who is carrying each side of your game so far.
  const carry: Record<number, LineupSlot> = {};
  if (myGame) {
    for (const side of [myGame.away, myGame.home]) {
      const best = [...side.lineup].sort((a, b) => b.points - a.points)[0];
      if (best && best.points > 0) carry[side.rosterId] = best;
    }
  }

  return (
    <Shell active="scoreboard">
      <LiveRefresh live={live} week={week} />
      <PageHead title="Scoreboard">
        <WeekPicker week={week} base="/scoreboard" />
      </PageHead>
      <div className={w.grid}>
        {myGame ? (
          <ScoreCard
            f={toFeature(myGame, 'Your game', models.get(myGame.matchupId))}
            title="Your game"
            carry={carry}
            lore={lore}
            foot={
              <>
                {myGame.status !== 'final' ? <SleeperPill action="lineup" label="Set lineup" /> : <span />}
                <PillLink href={`/scoreboard/${week}/${myGame.matchupId}`} small>
                  Open game
                </PillLink>
              </>
            }
          />
        ) : (
          <Widget size="m" icon="helmet" title="Your game">
            <div className={s.nudge}>
              <Squirt mood="calm" size={64} />
              <div className={s.nudgeText}>
                <p>{mine != null ? `No game for your team in week ${week}.` : 'No team picked on this device.'}</p>
                {mine == null ? (
                  <PillLink href="/settings" small>
                    Pick your team
                  </PillLink>
                ) : null}
              </div>
            </div>
          </Widget>
        )}

        {week === league.state.week ? <Verdicts verdicts={verdicts} mine={mine} week={week} /> : null}

        <section className={`${w.widget} ${w.m} ${s.tick}`}>
          <WidgetHead icon="football" title={myGame ? 'Every other game' : 'Every game'} />
          {others.length ? (
            <div className={s.tiles}>
              {others.map((g) => (
                <MatchTile key={g.matchupId} game={g} outlook={outlookOf(models.get(g.matchupId))} mine={isMine(g)} lore={lore} closest={closest === g} />
              ))}
            </div>
          ) : (
            <p className={s.empty}>No matchups posted for week {week}.</p>
          )}
          <span className={s.via}>Sources | Sleeper, DraftSharks, DraftKings, Squirt model</span>
        </section>

        <Widget size="l" icon="tv" title={`NFL week ${week}`}>
          <Slate games={ctx.nfl} lines={lines} startersByTeam={startersByNflTeam(games)} lineBook={lineBook} />
          <span className={s.via}>Sources | {lineBook ? `ESPN, ${lineBook}` : 'ESPN'}</span>
        </Widget>
      </div>
    </Shell>
  );
}
