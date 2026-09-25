/**
 * Win probability as one bar rather than two tubes.
 *
 * It used to be a pair of tall liquid-filled tubes, one per side, which took
 * a third of the card to say a single number twice: the two always sum to a
 * hundred, so the second tube carries no information the first has not
 * already given. One horizontal bar splits at the probability, each side
 * holding its own team colour, and the percentages sit above it at size.
 *
 * Pure markup and CSS so the client Your Matchup card can render it too.
 */
export default function WinBar({
  away,
  home,
  caption = 'Win probability',
}: {
  away: { pct: number; primary: string; name: string };
  home: { pct: number; primary: string; name: string };
  caption?: string;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 100)));
  const awayPct = clamp(away.pct);
  const homePct = 100 - awayPct;
  // The bar never lets a side vanish completely: at 99 to 1 the loser still
  // reads as a sliver of colour rather than as an empty end.
  const fill = Math.max(3, Math.min(97, awayPct));

  return (
    <div
      className="snffl-winbar"
      role="img"
      aria-label={`${away.name} ${awayPct} percent, ${home.name} ${homePct} percent`}
    >
      <div className="snffl-winbar-heads">
        <span className="snffl-winbar-side">
          <i className="snffl-winbar-dot" style={{ background: away.primary }} aria-hidden />
          <b className="snffl-numeric">{awayPct}%</b>
        </span>
        <span className="snffl-winbar-caption">{caption}</span>
        <span className="snffl-winbar-side snffl-winbar-side-right">
          <b className="snffl-numeric">{homePct}%</b>
          <i className="snffl-winbar-dot" style={{ background: home.primary }} aria-hidden />
        </span>
      </div>
      <div className="snffl-winbar-track">
        <span className="snffl-winbar-fill" style={{ width: `${fill}%`, background: away.primary }} />
        <span
          className="snffl-winbar-fill snffl-winbar-fill-right"
          style={{ width: `${100 - fill}%`, background: home.primary }}
        />
      </div>
    </div>
  );
}
