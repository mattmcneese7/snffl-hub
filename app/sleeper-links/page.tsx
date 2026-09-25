import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import { candidateAppLinks } from '@/lib/sleeper-links';

// Unlisted: no nav entry, and the whole site is already out of search results.
// It exists so Matt can tap each candidate on a real iPhone and report which
// ones open the Sleeper app, and on which screen. Whatever works goes into
// APP_LINKS in lib/sleeper-links.ts.
export const metadata = { title: 'Sleeper link test' };

export default function SleeperLinksTest() {
  const links = candidateAppLinks();
  return (
    <>
      <Chrome section="Link Test" />
      <main className="snffl-page">
        <PageHead title="Sleeper Link Test" />
        <section>
          <div className="snffl-card snffl-rules-card">
            <p className="snffl-rules-intro">
              Tap each link on your iPhone with the Sleeper app installed. For each one, note
              whether it opened the app, and on which screen. A link that shows an error or opens
              Safari did not work. Come back here between taps.
            </p>
          </div>
        </section>

        <section className="snffl-card">
          {links.map((link, i) => (
            <div className="snffl-menu-row" key={link.id}>
              <span>
                <span className="snffl-menu-label">
                  {i + 1}. {link.label}
                </span>
                <span className="snffl-menu-note">{link.note}</span>
                <span className="snffl-menu-note">
                  <code>{link.href}</code>
                </span>
              </span>
              <a className="snffl-sleeper-action snffl-sleeper-action-compact" href={link.href}>
                <span>Try</span>
              </a>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
