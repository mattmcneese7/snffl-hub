import { SourceStrip } from '@/components/SourceMark';
import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import StandingsTable from '@/components/StandingsTable';
import { getStandings, league } from '@/lib/league';
import { getPickupCounts } from '@/lib/transactions';
import { getTrophyBoard } from '@/lib/trophies';

export default async function StandingsPage() {
  const [standings, pickups, trophies] = await Promise.all([
    getStandings(),
    getPickupCounts(),
    getTrophyBoard(),
  ]);

  const totalAdds = Object.values(pickups).reduce((sum, p) => sum + p.total, 0);

  return (
    <>
      <Chrome section="Standings" />
      <main className="snffl-page">
        <PageHead title="Standings" />
        <section>
          <StandingsTable standings={standings} pickups={pickups} holders={trophies.holders} />
          <p className="snffl-chug-axis-note">
            Top {league.playoffTeams} make the playoffs. PF is points for, PA is points against.
            Adds counts waiver claims and free agent pickups, {totalAdds} across the league so
            far.
          </p>
          <SourceStrip items={[{ source: 'sleeper', label: 'Records and points' }]} />
        </section>
      </main>
    </>
  );
}
