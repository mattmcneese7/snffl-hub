'use client';

import { useState } from 'react';
import p from './p4.module.css';
import t from './bars.module.css';

/**
 * Points by week as plain SVG: a solid bar for a week that went the good way
 * (won, or started), an outline for the other (lost, or benched), the
 * playoff weeks washed in powder. The axis comes off the same scale as the
 * bars, so a bar that reaches the 120 line scored 120. A tap on any week's
 * column reads it out above the chart; tapping it again goes back to the best.
 */
export default function PointsBars({
  points,
  playoffWeekStart,
  weeks,
  solid,
  hollow,
}: {
  points: { week: number; points: number; good: boolean }[];
  playoffWeekStart: number;
  weeks: number;
  solid: string;
  hollow: string;
}) {
  if (!points.length) return <p className={p.via}>No scored weeks yet.</p>;
  const W = 320;
  const H = 160;
  const left = 30;
  const top = 16;
  const bottom = 20;
  const plotH = H - top - bottom;
  const plotW = W - left - 2;
  const high = Math.max(...points.map((x) => x.points), 1);
  const step = [5, 10, 20, 25, 50, 100].find((s) => high / s <= 4) ?? 100;
  const max = Math.ceil(high / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const y = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  const col = plotW / weeks;
  const barW = Math.max(5, col * 0.62);
  const x = (week: number) => left + (week - 1) * col;
  const best = points.reduce((a, b) => (b.points > a.points ? b : a));
  const [picked, setPicked] = useState<number | null>(null);
  const shown = points.find((pt) => pt.week === picked) ?? best;
  return (
    <div className={p.chart}>
      <p className={t.readout} aria-live="polite">
        <b>{shown.points.toFixed(2)}</b>
        <span>
          Week {shown.week} &middot; {shown.good ? solid : hollow}
          {shown === best ? ' \u00b7 Best' : ''}
        </span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Points by week. Best ${best.points.toFixed(2)} in week ${best.week}.`}>
        {playoffWeekStart <= weeks ? <rect className={p.playoffs} x={x(playoffWeekStart)} y={top - 12} width={left + plotW - x(playoffWeekStart)} height={plotH + 12} rx={6} /> : null}
        {ticks.map((t) => (
          <g key={t}>
            <line className={p.gridLine} x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} />
            <text x={left - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {points.map((pt) => {
          const h = Math.max(1.5, y(0) - y(pt.points));
          const bx = x(pt.week) + (col - barW) / 2;
          const dim = picked != null && pt.week !== picked ? t.barDim : '';
          return pt.good ? (
            <rect key={pt.week} className={`${p.barSolid} ${dim}`} x={bx} y={y(0) - h} width={barW} height={h} rx={2} />
          ) : (
            <rect key={pt.week} className={`${p.barHollow} ${dim}`} x={bx + 0.75} y={y(0) - h + 0.75} width={barW - 1.5} height={Math.max(1, h - 0.75)} rx={2} />
          );
        })}
        {/* Full height columns, so a thumb finds a short bar as easily as a tall one. */}
        {points.map((pt) => (
          <rect
            key={`hit${pt.week}`}
            className={t.barHit}
            x={x(pt.week)}
            y={top - 12}
            width={col}
            height={plotH + 12 + bottom}
            role="button"
            tabIndex={0}
            aria-label={`Week ${pt.week}, ${pt.points.toFixed(2)} points`}
            onClick={() => setPicked((w) => (w === pt.week ? null : pt.week))}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPicked((w) => (w === pt.week ? null : pt.week))}
          />
        ))}
        {Array.from({ length: weeks }, (_, i) => i + 1)
          .filter((wk) => weeks <= 9 || wk % 2 === 1)
          .map((wk) => (
            <text key={wk} x={x(wk) + col / 2} y={H - 4} textAnchor="middle">
              {wk}
            </text>
          ))}
      </svg>
      <div className={p.legend}>
        <span>
          <i />
          {solid}
        </span>
        <span>
          <i className={p.hollowKey} />
          {hollow}
        </span>
        {playoffWeekStart <= weeks ? <span>Shaded: playoffs</span> : null}
      </div>
    </div>
  );
}
