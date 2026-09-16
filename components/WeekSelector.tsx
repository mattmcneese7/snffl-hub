import Link from 'next/link';

/** Weeks 1 to 17, per Brief Section 2. */
export default function WeekSelector({
  active,
  hrefFor,
  weeks = 17,
}: {
  active: number;
  hrefFor: (week: number) => string;
  weeks?: number;
}) {
  return (
    <div className="snffl-week-selector">
      {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
        <Link
          key={week}
          href={hrefFor(week)}
          className={`snffl-week-pill${week === active ? ' snffl-week-pill-active' : ''}`}
          aria-current={week === active ? 'page' : undefined}
        >
          <span>WK {week}</span>
        </Link>
      ))}
    </div>
  );
}
