import Chrome from '@/components/Chrome';
import ResultBug from '@/components/ResultBug';
import WeekSelector from '@/components/WeekSelector';
import { getWeekGames } from '@/lib/league';

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  const week = Math.min(17, Math.max(1, Number(raw) || 1));
  const games = await getWeekGames(week);

  return (
    <>
      <Chrome section="Matchups" week={week} />
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
