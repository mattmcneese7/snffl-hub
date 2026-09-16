import Chrome from '@/components/Chrome';

/**
 * The Feed exists as a route now rather than in Checkpoint 7, because the tab
 * bar has linked here since Checkpoint 3 and was returning a 404 in production
 * on every page. Checkpoint 7 fills it with the live layer.
 */
const SECTIONS = [
  {
    title: 'Live Alerts',
    note: 'Touchdowns, lead changes and big plays as they happen, with the full width TOUCHDOWN wipe.',
  },
  {
    title: "C'mon Man",
    note: 'The worst decisions of the week, fantasy and NFL, kept separate.',
  },
  {
    title: 'Shart Watch',
    note: 'Whoever is tracking toward the lowest score, called out early and often.',
  },
  {
    title: 'Highlights',
    note: 'Real clips from the week, split into Owned and Free Agents, with a waiver button on the ones nobody has claimed.',
  },
];

export default function FeedPage() {
  return (
    <>
      <Chrome section="The Feed" />
      <main className="snffl-page">
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">The Feed</h2>
            <span className="snffl-block-heading-link">Checkpoint 7</span>
          </div>
          <div className="snffl-placeholder">
            <span className="snffl-placeholder-label">Not live yet</span>
            <span className="snffl-placeholder-note">
              Posts start arriving once the live layer is running. Scores on screen refresh every
              30 seconds during games, and the watcher writes at most 4 posts an hour.
            </span>
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">What Lands Here</h2>
          </div>
          <div className="snffl-card">
            {SECTIONS.map((section) => (
              <div className="snffl-menu-row" key={section.title}>
                <span>
                  <span className="snffl-menu-label">{section.title}</span>
                  <span className="snffl-menu-note">{section.note}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
