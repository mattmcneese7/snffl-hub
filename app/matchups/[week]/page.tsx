import Chrome from '@/components/Chrome';
import LiveRefresh from '@/components/LiveRefresh';
import NflSlate from '@/components/NflSlate';
import ResultBug from '@/components/ResultBug';
import { SourceStrip } from '@/components/SourceMark';
import SquirtSays from '@/components/SquirtSays';
import PageHead from '@/components/PageHead';
import WeekSelector from '@/components/WeekSelector';
import YourMatchup from '@/components/YourMatchup';
import { toFeature } from '@/lib/feature';
import { leagueVerdicts, oracleFor } from '@/lib/squirt-says';
import { getWeekGames, teams } from '@/lib/league';
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
  // The tightest game on the board, for the page's opening facts.
  const closest = games.length
    ? games.reduce((tightest, game) => (game.margin < tightest.margin ? game : tightest))
    : null;

  return (
    <>
      <Chrome section="Matchups" week={week} />
      <LiveRefresh live={live} week={week} />
      <main className="snffl-page">
        <PageHead
          title="Matchups"
        />

        <section>
          <WeekSelector active={week} hrefFor={(w) => `/matchups/${w}`} />
        </section>

        {/* Yours first. The question a Sunday opens with is how am I doing, and
            the page used to answer it somewhere below fourteen lineups of
            advice and a grid of seven games. */}
        <section className="snffl-matchups-yours">
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Your game</h2>
            <span className="snffl-block-heading-link">Week {week}</span>
          </div>
          <YourMatchup
            options={games.map((game) => toFeature(game, 'Your game', models.get(game.matchupId)))}
            teams={teams.map((team) => ({
              rosterId: team.rosterId,
              teamName: team.teamName,
              manager: team.manager,
            }))}
          />
        </section>

        {/* Squirt sits high but folded. Fourteen verdicts is a lot to walk
            past on the way to a scoreboard, and the first thing worth reading
            once the score has been read. */}
        {sayings.length ? (
          <section>
            <div className="snffl-card">
              <SquirtSays verdicts={sayings} week={week} collapsible />
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

        {/* Then the league at a glance, before any of its detail. */}
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">The league</h2>
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
