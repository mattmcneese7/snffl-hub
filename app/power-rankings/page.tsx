import { SourceStrip } from '@/components/SourceMark';
import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import PowerRankRow from '@/components/PowerRankRow';
import { getPowerRankings } from '@/lib/league';

export default async function PowerRankingsPage() {
  const rankings = await getPowerRankings();

  return (
    <>
      <Chrome section="Power Rankings" />
      <main className="snffl-page">
        <PageHead title="Power Rankings" />
        <section>
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
