import Chrome from '@/components/Chrome';
import LiveRefresh from '@/components/LiveRefresh';
import NflSlate from '@/components/NflSlate';
import ResultBug from '@/components/ResultBug';
import { SourceStrip } from '@/components/SourceMark';
import Squirtfucius from '@/components/Squirtfucius';
import WeekSelector from '@/components/WeekSelector';
import { leagueVerdicts, oracleFor } from '@/lib/squirtfucius';
import { getWeekGames } from '@/lib/league';
import {
  getMatchupContext,
  outlookOf,
  startersByNflTeam,
  winProbabilities,
} from '@/lib/matchup-live';

/**
 * Every week is prerendered, so a week page is served from the cache the way
 * Home is rather than built on the request. It was the slowest page on the
 * site, 1.8 seconds cold against 0.14 for Home, entirely because a dynamic
 * segment with no static params renders on demand every time. The fetches
 * inside it already carry their own revalidate, the shortest of which decides
 * how fresh the page is, and live scores arrive through the client poll.
 */
export function generateStaticParams() {
  return Array.from({ length: 17 }, (_, i) => ({ week: String(i + 1) }));
}

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = Math.min(17, Math.max(1, Number(raw) || 1));
  const [games, ctx, oracle] = await Promise.all([
    getWeekGames(week),
    getMatchupContext(week),
    oracleFor(week),
  ]);
  // One saying per manager, the mistakes he can still fix first.
  const sayings = leagueVerdicts(oracle.sides, oracle.input);
  // ESPN rather than the game status: status is derived from week arithmetic,
  // so it can read live on a week that simply has points on the board. Whether
  // a ball is actually in play is the honest gate for a 30 second poll.
  const live = ctx.nfl.some((game) => game.state === 'in');
  const models = winProbabilities(games, ctx);

  return (
    <>
      <Chrome section="Matchups" week={week} />
      <LiveRefresh live={live} week={week} />
      <main className="snffl-page">
        <section>
          <WeekSelector active={week} hrefFor={(w) => `/matchups/${w}`} />
        </section>

        {sayings.length ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Squirtfucius Says</h2>
              <span className="snffl-block-heading-link">All 14 lineups</span>
            </div>
            <div className="snffl-card">
              <Squirtfucius verdicts={sayings} week={week} />
            </div>
            <SourceStrip
              items={[
                { source: 'sleeper', label: 'Projections' },
                { source: 'draftsharks', label: 'Floors and ceilings' },
                { source: 'draftkings', label: 'Game totals' },
              ]}
            />
          </section>
        ) : null}

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Week {week}</h2>
            <span className="snffl-block-heading-link">
              {games.length} {games.length === 1 ? 'game' : 'games'}
            </span>
          </div>

          {games.length ? (
            <>
              <div className="snffl-matchups-grid">
                {games.map((game) => (
                  <div className="snffl-card" key={game.matchupId}>
                    <ResultBug game={game} outlook={outlookOf(models.get(game.matchupId))} />
                  </div>
                ))}
              </div>
              <SourceStrip
                items={[
                  { source: 'snffl', label: 'Win probability' },
                  { source: 'sleeper', label: 'Projections' },
                  { source: 'draftsharks', label: 'Ranges' },
                ]}
              />
            </>
          ) : (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Nothing yet</span>
              <span className="snffl-placeholder-note">
                Week {week} has no matchups posted. Sleeper publishes them closer to kickoff.
              </span>
            </div>
          )}
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">The Slate</h2>
            <span className="snffl-block-heading-link">NFL Week {week}</span>
          </div>
          <NflSlate games={ctx.nfl} lines={ctx.lines} startersByTeam={startersByNflTeam(games)} />
        </section>
      </main>
    </>
  );
}
