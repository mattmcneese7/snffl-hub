import Chrome from '@/components/Chrome';
import LiveRefresh from '@/components/LiveRefresh';
import ResultBug from '@/components/ResultBug';
import WeekSelector from '@/components/WeekSelector';
import { anyGameLive, getNflScoreboard } from '@/lib/espn';
import { getWeekGames } from '@/lib/league';

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = Math.min(17, Math.max(1, Number(raw) || 1));
  // ESPN rather than the game status: status is derived from week arithmetic,
  // so it can read live on a week that simply has points on the board. Whether
  // a ball is actually in play is the honest gate for a 30 second poll.
  const [games, nfl] = await Promise.all([getWeekGames(week), getNflScoreboard()]);
  const live = anyGameLive(nfl);

  return (
    <>
      <Chrome section="Matchups" week={week} />
      <LiveRefresh live={live} />
      <main className="snffl-page">
        <section>
          <WeekSelector active={week} hrefFor={(w) => `/matchups/${w}`} />
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Week {week}</h2>
            <span className="snffl-block-heading-link">
              {games.length} {games.length === 1 ? 'game' : 'games'}
            </span>
          </div>

          {games.length ? (
            <div className="snffl-matchups-grid">
              {games.map((game) => (
                <div className="snffl-card" key={game.matchupId}>
                  <ResultBug game={game} />
                </div>
              ))}
            </div>
          ) : (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Nothing yet</span>
              <span className="snffl-placeholder-note">
                Week {week} has no matchups posted. Sleeper publishes them closer to kickoff.
              </span>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
