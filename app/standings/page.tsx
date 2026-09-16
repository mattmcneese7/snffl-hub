import Chrome from '@/components/Chrome';
import StandingsTable from '@/components/StandingsTable';
import { getStandings, league } from '@/lib/league';
import { getPickupCounts } from '@/lib/transactions';

export default async function StandingsPage() {
  const [standings, pickups] = await Promise.all([getStandings(), getPickupCounts()]);

  const totalAdds = Object.values(pickups).reduce((sum, p) => sum + p.total, 0);

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
          <StandingsTable standings={standings} pickups={pickups} />
          <p className="snffl-chug-axis-note">
            PF is points for, PA is points against. Adds counts waiver claims and free agent
            pickups, {totalAdds} across the league so far.
          </p>
        </section>
      </main>
    </>
  );
}
