/**
 * How a page opens: its name, and nothing else.
 *
 * Every screen used to start with a heading and then a sentence explaining
 * what the screen was, which is filler. The sentence was replaced with a row
 * of figures, which was worse: a margin, a count and a percentage sitting
 * above a card that already showed all three. A number earns its place next
 * to the thing it describes, not in a strip at the top proving the page can
 * count.
 */
export default function PageHead({
  title,
  editorial = false,
  compact = false,
}: {
  title: string;
  /** For sections that are brands in their own right, like the Rag. */
  editorial?: boolean;
  /**
   * For the pages the dock already names. A tab bar reading "Feed" under a
   * masthead reading FEED is the same word twice, and the second one costs
   * sixty pixels of a phone screen. The pages behind More have no tab naming
   * them, so those keep the full size: it is the only thing telling you where
   * you are. The heading stays an h1 either way, because the page still needs
   * one and a screen reader still has to hear it.
   */
  compact?: boolean;
}) {
  const kind = [
    'snffl-page-title',
    editorial ? 'snffl-headline-editorial' : '',
    compact ? 'snffl-page-title-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <header className="snffl-page-head">
      <h1 className={kind}>{title}</h1>
    </header>
  );
}
