import Link from 'next/link';
import { getFeedPosts } from '@/lib/feed';
import { buildFeed, type FeedItem } from '@/lib/feed-view';
import type { Game } from '@/lib/types';
import { isPhone } from '../../../lib/device';
import ClipRail from './ClipRail';
import FeedTabs from './FeedTabs';
import { leagueRailClips } from './leagueClips';
import { FEED_MARK, feedMarkClass, timeAgo } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

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
    <section aria-label="The Feed">
      <div className={s.title}>
        <h2>The Feed</h2>
        <Link href="/lab/app/feed">Everything</Link>
      </div>
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
          <p className={s.empty} data-show="clips">
            No league clips yet this week.
          </p>
        )}
        {list.length ? (
          <div className={s.list} data-show="all league">
            {list.map((item, i) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href="/lab/app/feed"
                data-show={i < 3 ? 'all league' : 'league'}
                className={`${m.post} ${mineId && item.managerIds.includes(mineId) ? m.mine : ''}`}
              >
                <i className={feedMarkClass(item.kind)}>{FEED_MARK[item.kind]}</i>
                <span className={m.postText}>
                  <b>{item.title}</b>
                  {item.body ? <span>{item.body}</span> : null}
                  <small>{timeAgo(item.at, now)}</small>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className={s.empty} data-show="all league">
            Touchdowns, lead changes and callouts post here as they happen.
          </p>
        )}
      </FeedTabs>
    </section>
  );
}
