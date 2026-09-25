/**
 * How a page opens.
 *
 * Every screen used to start with a heading and then a sentence explaining
 * what the screen was, which is filler: nobody needs to be told that the Feed
 * holds the feed, and a paragraph of instructions is an unceremonious way to
 * begin. A page opens with its name at size, and then facts, because numbers
 * that are true right now are the only intro a screen like this needs.
 */
export type PageFact = { label: string; value: string; tone?: 'live' | 'plain' };

export default function PageHead({
  title,
  facts = [],
  editorial = false,
}: {
  title: string;
  facts?: PageFact[];
  /** For sections that are brands in their own right, like the Rag. */
  editorial?: boolean;
}) {
  return (
    <header className="snffl-page-head">
      <h1 className={`snffl-page-title${editorial ? ' snffl-headline-editorial' : ''}`}>{title}</h1>
      {facts.length ? (
        <dl className="snffl-page-facts">
          {facts.map((fact) => (
            <div className={`snffl-page-fact${fact.tone === 'live' ? ' snffl-page-fact-live' : ''}`} key={fact.label}>
              <dt>{fact.label}</dt>
              <dd className="snffl-numeric">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
