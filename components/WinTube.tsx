/**
 * Win probability as water, poured from the same wordmark the header drips.
 *
 * The level is the probability; the percentage sits low in the tube on the
 * deepest part of the liquid, which is where its contrast is measured. Under
 * 22 percent the liquid is too shallow to hold the label, so it moves above
 * the surface and takes the ink color instead.
 *
 * Pure markup and CSS, no lib imports, so the client Your Matchup card can
 * render it as well.
 */
export default function WinTube({
  pct,
  tone,
  label,
  caption = 'WIN PROB',
}: {
  /** 0 to 1. */
  pct: number;
  tone: 'water' | 'red';
  /** Accessible name, "Jackson Off win probability 67 percent". */
  label: string;
  caption?: string;
}) {
  const shown = Math.round(Math.max(0, Math.min(1, pct)) * 100);
  const shallow = shown < 22;
  return (
    <div
      className={`snffl-tube snffl-tube-${tone}${shallow ? ' snffl-tube-shallow' : ''}`}
      style={{ ['--p' as string]: `${Math.max(shown, 3)}%` }}
      role="img"
      aria-label={label}
    >
      <div className="snffl-tube-liquid">
        <svg className="snffl-tube-wave" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden>
          <path d="M0 5Q15 0 30 5T60 5T90 5T120 5V10H0Z" />
        </svg>
      </div>
      <span className="snffl-tube-label">
        <small>{caption}</small>
        {shown}%
      </span>
    </div>
  );
}
