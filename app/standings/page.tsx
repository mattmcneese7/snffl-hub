import Chrome from '@/components/Chrome';
import StandingsTable from '@/components/StandingsTable';
import { getStandings, league } from '@/lib/league';

export default async function StandingsPage() {
  const standings = await getStandings();

  return (
    <>
      <Chrome section="Standings" />
      <main className="snffl-page">
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Standings</h2>
            <span className="snffl-block-heading-link">
              Top {league.playoffTeams} make the playoffs
            </span>
          </div>
          <StandingsTable standings={standings} />
        </section>
      </main>
    </>
  );
}
