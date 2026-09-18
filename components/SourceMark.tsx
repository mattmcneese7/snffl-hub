/**
 * Where a number came from, with the source's own mark.
 *
 * Worded "via" rather than "powered by": the league uses these sources, it is
 * not partnered with them, and the badge should not suggest otherwise. Each
 * mark is the source's own published asset, stored in public/sources so a
 * visitor's page never hotlinks a third party.
 *
 * Deliberately free of lib imports so client components can use it too.
 */

export type Source = 'espn' | 'sleeper' | 'draftsharks' | 'draftkings' | 'youtube' | 'snffl';

const SOURCES: Record<Source, { name: string; href: string | null }> = {
  espn: { name: 'ESPN', href: 'https://www.espn.com/nfl/' },
  sleeper: { name: 'Sleeper', href: 'https://sleeper.com/' },
  draftsharks: { name: 'DraftSharks', href: 'https://www.draftsharks.com/ros-rankings/ppr' },
  // Credited, never linked: a link from a league site into a sportsbook is an
  // ad nobody asked to run.
  draftkings: { name: 'DraftKings', href: null },
  youtube: { name: 'YouTube', href: 'https://www.youtube.com/@NFL' },
  snffl: { name: 'SNFFL model', href: null },
};

function Mark({ source }: { source: Source }) {
  switch (source) {
    case 'draftkings':
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="snffl-source-logo snffl-source-wide snffl-theme-light-only" src="/sources/draftkings-light.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="snffl-source-logo snffl-source-wide snffl-theme-dark-only" src="/sources/draftkings-dark.svg" alt="" />
        </>
      );
    case 'draftsharks':
      return (
        <span className="snffl-source-tile snffl-source-tile-ds" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sources/draftsharks.svg" alt="" />
        </span>
      );
    case 'espn':
      // eslint-disable-next-line @next/next/no-img-element
      return <img className="snffl-source-logo snffl-source-espn" src="/sources/espn.png" alt="" />;
    case 'sleeper':
      // eslint-disable-next-line @next/next/no-img-element
      return <img className="snffl-source-logo snffl-source-round" src="/sources/sleeper.png" alt="" />;
    case 'youtube':
      // eslint-disable-next-line @next/next/no-img-element
      return <img className="snffl-source-logo" src="/sources/youtube.svg" alt="" />;
    case 'snffl':
      return <span className="snffl-source-tile snffl-source-tile-snffl" aria-hidden>S</span>;
  }
}

export default function SourceMark({
  source,
  label,
}: {
  source: Source;
  /** What the source supplied: "Odds", "Stats", "Projections". */
  label: string;
}) {
  const { name, href } = SOURCES[source];
  const body = (
    <>
      <Mark source={source} />
      <span className="snffl-source-text">
        {label} via <strong>{name}</strong>
      </span>
    </>
  );
  return href ? (
    <a className="snffl-source" href={href} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <span className="snffl-source">{body}</span>
  );
}

/** A row of credits under a panel. */
export function SourceStrip({ items }: { items: { source: Source; label: string }[] }) {
  return (
    <div className="snffl-source-strip">
      {items.map((item) => (
        <SourceMark key={`${item.source}-${item.label}`} source={item.source} label={item.label} />
      ))}
    </div>
  );
}
