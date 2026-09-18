import { SourceStrip } from '@/components/SourceMark';
import Chrome from '@/components/Chrome';
import PowerRankRow from '@/components/PowerRankRow';
import { getPowerRankings } from '@/lib/league';

export default async function PowerRankingsPage() {
  const rankings = await getPowerRankings();

  return (
    <>
      <Chrome section="Power Rankings" />
      <main className="snffl-page">
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Power Rankings</h2>
            <span className="snffl-block-heading-link">All {rankings.length}</span>
          </div>
          <div className="snffl-card">
            {rankings.map((entry) => (
              <PowerRankRow key={entry.team.rosterId} entry={entry} />
            ))}
          </div>
          <SourceStrip
            items={[
              { source: 'snffl', label: 'Rankings' },
              { source: 'sleeper', label: 'Scores' },
            ]}
          />
        </section>
      </main>
    </>
  );
}
