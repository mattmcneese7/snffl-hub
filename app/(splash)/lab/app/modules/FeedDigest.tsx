import Link from 'next/link';
import { getFeedPosts } from '@/lib/feed';
import { buildFeed, type FeedItem } from '@/lib/feed-view';
import type { Game } from '@/lib/types';
import { isPhone } from '../../../lib/device';
import ClipRail from './ClipRail';
import FeedTabs from './FeedTabs';
import { leagueRailClips } from './leagueClips';
import { FEED_MARK, feedMarkTone, timeAgo } from './shared';
import { Empty, Section, Tag, ui } from '../ui';

/**
 * The Feed on Home: the newest league clip playing in place, then the
 * latest scoring updates, with the toggle between NFL clips and the
 * league's own posts.
 */
export default async function FeedDigest({ week, games, mine = null, items }: { week: number; games: Game[]; mine?: number | null; items?: FeedItem[] }) {
  const [posts, clips, phone] = await Promise.all([
    items ? Promise.resolve(items) : getFeedPosts(8).then((p) => buildFeed(p, [])).catch((): FeedItem[] => []),
    leagueRailClips(week, games, 3).catch(() => []),
    isPhone(),
  ]);
  const list = posts.filter((i) => i.kind !== 'clip').slice(0, 5);
  const now = Date.now();
  const mineId = mine != null ? String(mine) : null;
  return (
    <Section title="The Feed" action={{ href: '/lab/app/feed', label: 'Everything' }}>
      <FeedTabs id="home">
        {clips.length ? (
          <>
            <div data-show="all">
              <ClipRail clips={clips.slice(0, 1)} phone={phone} stack />
            </div>
            <div data-show="clips">
              <ClipRail clips={clips} phone={phone} stack />
            </div>
          </>
        ) : (
          <div data-show="clips">
            <Empty>No league clips yet this week.</Empty>
          </div>
        )}
        {list.length ? (
          <div className={`${ui.list} ${ui.tapList}`} data-show="all league">
            {list.map((item, i) => (
              <Link key={`${item.kind}-${item.id}`} href="/lab/app/feed" data-show={i < 3 ? 'all league' : 'league'} className={ui.row}>
                <Tag tone={feedMarkTone(item.kind)}>{FEED_MARK[item.kind]}</Tag>
                <span className={ui.body}>
                  <span className={`${ui.title} ${mineId && item.managerIds.includes(mineId) ? ui.strong : ''}`}>{item.title}</span>
                  {item.body ? <span className={ui.sub}>{item.body}</span> : null}
                  <span className={ui.valueSub}>{timeAgo(item.at, now)}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div data-show="all league">
            <Empty>Touchdowns, lead changes and callouts post here as they happen.</Empty>
          </div>
        )}
      </FeedTabs>
    </Section>
  );
}
