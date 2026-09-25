import { KIND_LABELS, type FeedItem } from '@/lib/feed-view';

/**
 * The Feed on Home: the last few moments, in the same rows the section uses.
 *
 * It used to appear only while a game was live, which meant the Feed was
 * invisible six days a week even though it holds the whole season. It is a
 * section of its own now, so it sits in the sidebar all the time and says what
 * it is holding when nothing is happening.
 */
const MARK: Record<FeedItem['kind'], string> = {
  touchdown: 'TD',
  lead: 'LEAD',
  cmon: 'CMON',
  shart: 'SHART',
  clip: 'CLIP',
};

export default function FeedDigest({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">Quiet so far</span>
        <span className="snffl-placeholder-note">
          Touchdowns, lead changes and callouts land here as they happen.
        </span>
      </div>
    );
  }

  return (
    <ol className="snffl-feed-list snffl-feed-digest">
      {items.map((item) => (
        <li className="snffl-feed-row" key={`${item.kind}-${item.id}`}>
          <span className={`snffl-feed-mark snffl-feed-mark-${item.kind}`} aria-hidden>
            {MARK[item.kind]}
          </span>
          <span className="snffl-feed-row-main">
            <span className="snffl-feed-row-title">{item.title}</span>
            {item.body ? <span className="snffl-feed-row-body">{item.body}</span> : null}
            <span className="snffl-visually-hidden">{KIND_LABELS[item.kind]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
