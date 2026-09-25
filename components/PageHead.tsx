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
}: {
  title: string;
  /** For sections that are brands in their own right, like the Rag. */
  editorial?: boolean;
}) {
  return (
    <header className="snffl-page-head">
      <h1 className={`snffl-page-title${editorial ? ' snffl-headline-editorial' : ''}`}>{title}</h1>
    </header>
  );
}
