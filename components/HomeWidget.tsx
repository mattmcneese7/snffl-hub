import Link from 'next/link';

/**
 * A Home section with a heading and a way through to its full page. Every
 * section on Home uses this, which is what guarantees no page in the site is
 * unreachable from the front door.
 */
export default function HomeWidget({
  title,
  href,
  linkLabel = 'See all',
  children,
}: {
  /** A node rather than a string, so a section can lead with its own logo. */
  title: React.ReactNode;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="snffl-home-section">
      <div className="snffl-block-heading">
        <h2 className="snffl-headline">{title}</h2>
        {href ? (
          <Link className="snffl-block-heading-link" href={href}>
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
