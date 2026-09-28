import Link from 'next/link';
import type { MovementEvent } from '@/lib/movement';
import { timing } from '@/lib/movement';

/**
 * What the league has been doing, as it happens.
 *
 * Renders nothing when nothing has happened, rather than an empty state
 * explaining that nothing has happened. A quiet Wednesday is not a thing the
 * app needs to comment on.
 *
 * The time is the point of most of these. Benching somebody on Sunday morning
 * is a read on the injury report; the same benching twelve minutes before
 * kickoff is a panic, and only the timestamp tells them apart.
 */
export default function MovementFeed({
  events,
  limit = 8,
  showManager = true,
}: {
  events: MovementEvent[];
  limit?: number;
  showManager?: boolean;
}) {
  if (!events.length) return null;

  return (
    <ul className="snffl-card snffl-movement">
      {events.slice(0, limit).map((event) => (
        <li key={event.id} className={`snffl-movement-row snffl-movement-${event.kind}`}>
          <span className="snffl-movement-mark" aria-hidden />
          <span className="snffl-movement-text">
            <Link href={`/players/${event.playerId}`}>
              {showManager ? event.saying : withoutManager(event)}
            </Link>
          </span>
          <span className="snffl-movement-when">{timing(event.at)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The same sentence on a manager's own page, where his name on every line is
 * noise: he knows whose page he is reading.
 */
function withoutManager(event: MovementEvent): string {
  const rest = event.saying.slice(event.manager.length).trim();
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
