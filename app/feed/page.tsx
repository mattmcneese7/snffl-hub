import Chrome from '@/components/Chrome';
import FeedStream from '@/components/FeedStream';
import { getFeedPosts } from '@/lib/feed';
import { getHighlights } from '@/lib/highlights';
import { teams } from '@/lib/league';

/**
 * The Feed, Checkpoint 7.
 *
 * Posts are written by the live watcher into Supabase and read here. A failed
 * read returns an empty list rather than throwing, because the tab bar links to
 * this route from every screen and an outage must not 500 the site.
 */
export const revalidate = 30;

export default async function FeedPage() {
  const [posts, highlights] = await Promise.all([getFeedPosts(), getHighlights()]);

  // Keyed by text, because owner_team_id is a text column even though roster
  // ids are numbers everywhere else in the project.
  const managers = Object.fromEntries(teams.map((team) => [String(team.rosterId), team.manager]));

  return (
    <>
      <Chrome section="The Feed" />
      <main className="snffl-page">
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">The Feed</h2>
            <span className="snffl-block-heading-link">
              {posts.length ? `${posts.length} posts` : 'Quiet right now'}
            </span>
          </div>
          <p className="snffl-menu-note">
            Live alerts land here during games. Scores refresh every 30 seconds, and the watcher
            writes at most four posts an hour.
          </p>
        </section>

        <FeedStream posts={posts} highlights={highlights} managers={managers} />
      </main>
    </>
  );
}
