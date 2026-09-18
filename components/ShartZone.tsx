import Link from 'next/link';
import ManagerLink from './ManagerLink';
import Trophy from './Trophy';

/**
 * THE SHARTZONE. The wall of shame on Home: whoever posted the lowest score of
 * the last finished week, chugging this week, and every Shart before him.
 *
 * Cartoonishly poopy on purpose, and fixed in color in both themes: a brown
 * card that dripped a little, stink lines, and flies that buzz for anyone who
 * has not asked the phone to calm down. Colors are literals with their own
 * contrast entries.
 */

export type ShartEntry = {
  week: number;
  rosterId: number;
  firstName: string;
  teamName: string;
  avatarUrl: string | null;
  points: number;
};

function Fly({ className }: { className: string }) {
  return (
    <svg className={`snffl-shartzone-fly ${className}`} viewBox="0 0 20 14" aria-hidden>
      <ellipse cx="10" cy="9" rx="4" ry="3.2" fill="#1a1208" />
      <ellipse cx="6.5" cy="4.5" rx="3.6" ry="2.4" fill="#d9e4ee" opacity="0.85" />
      <ellipse cx="13.5" cy="4.5" rx="3.6" ry="2.4" fill="#d9e4ee" opacity="0.85" />
    </svg>
  );
}

export default function ShartZone({ current, wall }: { current: ShartEntry | null; wall: ShartEntry[] }) {
  return (
    <section className="snffl-shartzone" aria-label="The Shartzone">
      {/* The drip along the top edge. */}
      <svg className="snffl-shartzone-drip" viewBox="0 0 320 22" preserveAspectRatio="none" aria-hidden>
        <path
          d="M0 0h320v6c-8 0-10 14-18 14s-8-10-16-10-9 8-17 8-8-12-18-12-10 16-20 16-9-12-18-12-8 6-16 6-10-10-18-10-9 14-19 14-9-10-17-10-8 8-16 8-10-12-19-12-9 10-18 10-9-8-17-8-8 12-18 12-9-14-19-14-8 6-17 6-9-10-18-10-8 12-16 12S8 6 0 6z"
          fill="#3b2412"
        />
      </svg>
      <Fly className="snffl-shartzone-fly-a" />
      <Fly className="snffl-shartzone-fly-b" />

      <header className="snffl-shartzone-head">
        <h2 className="snffl-shartzone-title">THE SHARTZONE</h2>
        <span className="snffl-shartzone-sub">Wall of shame</span>
      </header>

      {current ? (
        <div className="snffl-shartzone-hero">
          <span className="snffl-shartzone-throne">
            {current.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.avatarUrl} alt="" />
            ) : (
              <span className="snffl-shartzone-initials">{current.firstName.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="snffl-shartzone-crown">
              <Trophy kind="shart" size={40} />
            </span>
            <span className="snffl-shartzone-stink" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </span>
          <span className="snffl-shartzone-verdict">
            <span className="snffl-shartzone-chugging">Chugging this week</span>
            <ManagerLink rosterId={current.rosterId} className="snffl-shartzone-name">
              {current.firstName}
            </ManagerLink>
            <span className="snffl-shartzone-team">{current.teamName}</span>
            <span className="snffl-shartzone-score">
              {current.points.toFixed(2)}
              <small>Week {current.week}</small>
            </span>
          </span>
        </div>
      ) : (
        <p className="snffl-shartzone-empty">
          Nobody has sharted yet. Give it one final whistle.
        </p>
      )}

      {wall.length > 1 ? (
        <ol className="snffl-shartzone-wall">
          {wall.slice(1).map((entry) => (
            <li key={entry.week}>
              <span className="snffl-shartzone-week">Wk {entry.week}</span>
              <ManagerLink rosterId={entry.rosterId} className="snffl-shartzone-wall-name">
                {entry.firstName}
              </ManagerLink>
              <span className="snffl-shartzone-wall-score">{entry.points.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <Link className="snffl-shartzone-link" href="/chug">
        Full Chug Meter
      </Link>
    </section>
  );
}
