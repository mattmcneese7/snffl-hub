import { managerNames } from '@/lib/manager-names';
import { firstNameOf } from '@/config/managers';
import { SourceStrip } from '@/components/SourceMark';
import Chrome from '@/components/Chrome';
import FeedStream from '@/components/FeedStream';
import { getFeedPosts } from '@/lib/feed';
import { getHighlights, isRelevantClip } from '@/lib/highlights';
import { allPlayers, teams } from '@/lib/league';
import { getRecentAdds } from '@/lib/transactions';

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);

/**
 * The Feed, Checkpoint 7.
 *
 * Posts are written by the live watcher into Supabase and read here. A failed
 * read returns an empty list rather than throwing, because the tab bar links to
 * this route from every screen and an outage must not 500 the site.
 */
export const revalidate = 30;

export default async function FeedPage() {
  const [posts, allClips, recentAdds] = await Promise.all([
    getFeedPosts(),
    getHighlights(undefined, 120),
    getRecentAdds(),
  ]);
  const fantasy = new Set(
    allPlayers()
      .filter((player) => FANTASY_POSITIONS.has(player.position))
      .map((player) => player.id)
  );
  // Only clips someone in this league could care about: owned players and
  // D/STs, and unowned players at positions the league rosters.
  const highlights = allClips.filter((clip) => isRelevantClip(clip, (id) => fantasy.has(id)));
  const waiverIds = Object.keys(recentAdds);

  // Keyed by text, because owner_team_id is a text column even though roster
  // ids are numbers everywhere else in the project.
  const managers = Object.fromEntries(
    teams.map((team) => [String(team.rosterId), firstNameOf(team.rosterId) ?? team.manager])
  );

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

        <FeedStream
          posts={posts}
          highlights={highlights}
          waiverIds={waiverIds}
          managers={managers}
          names={managerNames()}
        />
        <SourceStrip
          items={[
            { source: 'espn', label: 'Plays' },
            { source: 'youtube', label: 'Highlights' },
          ]}
        />
      </main>
    </>
  );
}
