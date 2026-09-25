import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import SettingsPanel from '@/components/SettingsPanel';
import { teams } from '@/lib/league';

export default function SettingsPage() {
  return (
    <>
      <Chrome section="Settings" />
      <main className="snffl-page">
        <PageHead title="Settings" />
        <section>
          <SettingsPanel
            teams={teams.map((t) => ({
              rosterId: t.rosterId,
              teamName: t.teamName,
              manager: t.manager,
            }))}
          />
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Install On Your Phone</h2>
          </div>
          <div className="snffl-card snffl-rules-card">
            <h3 className="snffl-rules-subhead">iPhone</h3>
            <ol className="snffl-rules-list">
              <li>Open this site in Safari.</li>
              <li>Tap Share, then Add to Home Screen.</li>
              <li>Open it from the home screen icon.</li>
              <li>Turn on alerts here once they arrive. iPhone only delivers them to an installed app.</li>
            </ol>
            <h3 className="snffl-rules-subhead">Android</h3>
            <ol className="snffl-rules-list">
              <li>Open the browser menu.</li>
              <li>Tap Install, or Add to Home screen.</li>
              <li>Open it from the home screen icon.</li>
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
