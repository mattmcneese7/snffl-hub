import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import ChugMeter, { type ChugColumn } from '@/components/ChugMeter';
import { getChugCounts } from '@/lib/awards';
import { teams } from '@/lib/league';
import { CHUG_RULES, CHUG_SUBMISSION } from '@/config/league-rules';

export const metadata: Metadata = { title: 'Chug Meter' };

export default async function ChugPage() {
  const tallies = await getChugCounts();

  // Every manager gets a column, including the ones who have never chugged.
  const columns: ChugColumn[] = teams
    .map((team) => {
      const tally = tallies.find((t) => t.rosterId === team.rosterId);
      return {
        rosterId: team.rosterId,
        manager: team.manager,
        teamName: team.teamName,
        count: tally?.count ?? 0,
        weeks: tally?.weeks ?? [],
      };
    })
    .sort((a, b) => b.count - a.count || a.manager.localeCompare(b.manager));

  const owed = columns.filter((c) => c.count > 0);

  return (
    <>
      <Chrome section="Chug Meter" />
      <main className="snffl-page">
        <PageHead title="The Chug Meter" />
        <section>
          <div className="snffl-card snffl-chug-card">
            <ChugMeter columns={columns} />
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">{CHUG_RULES.title}</h2>
          </div>
          <div className="snffl-card snffl-rules-card">
            <p className="snffl-rules-intro">{CHUG_RULES.intro}</p>
            <ol className="snffl-rules-list">
              {CHUG_RULES.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <p className="snffl-rules-note">{CHUG_SUBMISSION}</p>
          </div>
        </section>
      </main>
    </>
  );
}
