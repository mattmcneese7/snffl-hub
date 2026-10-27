import Link from 'next/link';
import { getFeedPosts } from '@/lib/feed';
import { buildFeed, type FeedItem } from '@/lib/feed-view';
import { FEED_MARK, feedMarkClass, timeAgo } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

/** The Feed: the four newest moments the league watcher posted. */
export default async function FeedDigest({ items, mine = null }: { items?: FeedItem[]; mine?: number | null }) {
  const list = (items ?? buildFeed(await getFeedPosts(8).catch(() => []), [])).slice(0, 4);
  const now = Date.now();
  const mineId = mine != null ? String(mine) : null;
  return (
    <section aria-label="The Feed">
      <div className={s.title}>
        <h2>The Feed</h2>
        <Link href="/lab/app/feed">Everything</Link>
      </div>
      {list.length ? (
        <div className={s.list} style={{ marginTop: 8 }}>
          {list.map((item) => (
            <Link key={`${item.kind}-${item.id}`} href="/lab/app/feed" className={`${m.post} ${mineId && item.managerIds.includes(mineId) ? m.mine : ''}`}>
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
        <p className={s.empty} style={{ marginTop: 8 }}>
          Touchdowns, lead changes and callouts post here as they happen.
        </p>
      )}
    </section>
  );
}
