import { managerNames } from '@/lib/manager-names';
import { firstNameOf } from '@/config/managers';
import { SourceStrip } from '@/components/SourceMark';
import Chrome from '@/components/Chrome';
import FeedStream from '@/components/FeedStream';
import PageHead from '@/components/PageHead';
import { getFeedPosts } from '@/lib/feed';
import { getHighlights, isEspnClip, isRelevantClip } from '@/lib/highlights';
import { allPlayers, scoredWeek, teams } from '@/lib/league';

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
  const [posts, allClips] = await Promise.all([getFeedPosts(), getHighlights(undefined, 120)]);
  const fantasy = new Set(
    allPlayers()
      .filter((player) => FANTASY_POSITIONS.has(player.position))
      .map((player) => player.id)
  );
  // Only clips someone in this league could care about: owned players and
  // D/STs, and unowned players at positions the league rosters.
  const highlights = allClips.filter((clip) => isRelevantClip(clip, (id) => fantasy.has(id)));
  // Facts for the page's opening. Real counts, worked out here rather than
  // described in a sentence underneath the title.
  const playableCount = highlights.filter((clip) => isEspnClip(clip.id) && clip.thumbnail).length;
  const week = await scoredWeek();
  const thisWeekCount =
    posts.filter((post) => post.week === week).length +
    highlights.filter((clip) => clip.week === week).length;

  // Keyed by text, because owner_team_id is a text column even though roster
  // ids are numbers everywhere else in the project.
  const managers = Object.fromEntries(
    teams.map((team) => [String(team.rosterId), firstNameOf(team.rosterId) ?? team.manager])
  );

  return (
    <>
      <Chrome section="The Feed" />
      <main className="snffl-page">
        <PageHead
          title="The Feed"
        />

        <FeedStream
          posts={posts}
          highlights={highlights}
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
