import c from './chart.module.css';

/**
 * Points by week, drawn as plain SVG so the phone carries no chart library.
 * The same data v2's PointsByWeekChart shows (a score per played week and
 * whether it went the good way), drawn in Pool:
 *
 *   solid deep blue   a week won (a manager) or started (a player)
 *   deep blue outline a week lost, or a week on the bench
 *   powder wash       the playoff weeks
 *
 * The axis labels come off the same scale the bars are drawn on, so a bar
 * that reaches the 120 line scored 120. Nothing is smoothed or estimated:
 * a week with no score has no bar.
 */
export default function PointsChart({
  points,
  playoffWeekStart,
  weeks = 17,
  solid,
  hollow,
}: {
  points: { week: number; points: number; good: boolean }[];
  playoffWeekStart: number;
  weeks?: number;
  /** Legend words for the solid and the outlined bars. */
  solid: string;
  hollow: string;
}) {
  if (!points.length) {
    return <p className={c.empty}>No scored weeks yet.</p>;
  }

  const W = 320;
  const H = 168;
  const left = 30;
  const right = 4;
  const top = 18;
  const bottom = 22;
  const plotH = H - top - bottom;
  const plotW = W - left - right;

  // A round step, so the gridlines land on numbers people say out loud.
  const high = Math.max(...points.map((p) => p.points), 1);
  const step = [5, 10, 20, 25, 50, 100].find((s) => high / s <= 4) ?? 100;
  const max = Math.ceil(high / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const y = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;

  const col = plotW / weeks;
  const barW = Math.max(5, col * 0.62);
  const x = (week: number) => left + (week - 1) * col;
  const showPlayoffs = playoffWeekStart <= weeks;

  const best = points.reduce((a, b) => (b.points > a.points ? b : a));

  return (
    <div className={c.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={c.svg} role="img" aria-label={`Points by week. Best ${best.points.toFixed(2)} in week ${best.week}.`}>
        {showPlayoffs ? (
          <>
            <rect className={c.playoffs} x={x(playoffWeekStart)} y={top - 14} width={left + plotW - x(playoffWeekStart)} height={plotH + 14} rx={6} />
            <text className={c.playoffLabel} x={left + plotW - 4} y={top - 3} textAnchor="end">
              Playoffs
            </text>
          </>
        ) : null}

        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? c.axis : c.grid} x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} />
            <text className={c.tick} x={left - 6} y={y(t) + 3.5} textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        {points.map((p) => {
          const h = Math.max(1.5, y(0) - y(p.points));
          const bx = x(p.week) + (col - barW) / 2;
          return (
            <rect
              key={p.week}
              className={p.good ? c.solid : c.hollow}
              x={bx + (p.good ? 0 : 0.75)}
              y={y(0) - h + (p.good ? 0 : 0.75)}
              width={barW - (p.good ? 0 : 1.5)}
              height={Math.max(1, h - (p.good ? 0 : 0.75))}
              rx={2}
            >
              <title>{`Week ${p.week}: ${p.points.toFixed(2)}`}</title>
            </rect>
          );
        })}

        {Array.from({ length: weeks }, (_, i) => i + 1)
          .filter((wk) => wk % 2 === 1)
          .map((wk) => (
            <text key={wk} className={c.week} x={x(wk) + col / 2} y={H - 6} textAnchor="middle">
              {wk}
            </text>
          ))}
      </svg>

      <div className={c.legend}>
        <span className={c.key}>
          <i className={c.keySolid} aria-hidden />
          {solid}
        </span>
        <span className={c.key}>
          <i className={c.keyHollow} aria-hidden />
          {hollow}
        </span>
      </div>
    </div>
  );
}
