import Link from 'next/link';
import { notFound } from 'next/navigation';
import Chrome from '@/components/Chrome';
import FeatureMatchup from '@/components/FeatureMatchup';
import LineupTable from '@/components/LineupTable';
import { toFeature } from '@/lib/feature';
import { getWeekGames } from '@/lib/league';

export default async function MatchupDetail({
  params,
}: {
  params: Promise<{ week: string; matchupId: string }>;
}) {
  const { week: rawWeek, matchupId: rawId } = await params;
  const week = Math.min(17, Math.max(1, Number(rawWeek) || 1));
  const matchupId = Number(rawId);

  const games = await getWeekGames(week);
  const game = games.find((g) => g.matchupId === matchupId);
  if (!game) notFound();

  return (
    <>
      <Chrome section="Matchups" sub={`Week ${week}`} week={week} />
      <main className="snffl-page">
        <section>
          <Link className="snffl-block-heading-link" href={`/matchups/${week}`}>
            &larr; All Week {week} matchups
          </Link>
        </section>

        <section>
          <FeatureMatchup data={toFeature(game, `Week ${week}`)} />
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Lineups</h2>
          </div>
          <LineupTable away={game.away} home={game.home} winner={game.winner} />
        </section>
      </main>
    </>
  );
}
