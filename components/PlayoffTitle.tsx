/**
 * THE ^ PLAYOFF TRACKER, with the marker scribble written in above the caret.
 *
 * Shared rather than duplicated: the tracker page and the Home widget show the
 * same treatment, and the scribble changes with the week, so one copy keeps
 * them from drifting apart. Brief Section 2.
 */
export function scribbleFor(week: number): string | null {
  if (week <= 7) return 'way too early';
  if (week <= 11) return 'just in time';
  return null;
}

export default function PlayoffTitle({ week }: { week: number }) {
  const scribble = scribbleFor(week);

  return (
    <>
      THE{' '}
      {/* The caret and the scribble are a drawn annotation, not part of the
          name. Left readable they concatenate into "THE way too early^ PLAYOFF
          TRACKER" in the accessibility tree, so the accessible name keeps the
          marks out and reads THE PLAYOFF TRACKER. */}
      <span className="snffl-playoff-mark" aria-hidden>
        {scribble ? <span className="snffl-playoff-scribble">{scribble}</span> : null}
        <span className="snffl-playoff-caret">^</span>
      </span>{' '}
      PLAYOFF TRACKER
    </>
  );
}
