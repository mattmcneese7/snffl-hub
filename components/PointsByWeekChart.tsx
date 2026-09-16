/**
 * Points by week, hand built inline SVG so the phone bundle carries no chart
 * library. Playoff weeks are shaded, per Brief Section 2.
 *
 * Colors come from classes, never from CSS variables inside SVG presentation
 * attributes, per Brief Section 4 rule 6.
 */
export default function PointsByWeekChart({
  points,
  playoffWeekStart,
  weeks = 17,
}: {
  points: { week: number; points: number; won: boolean }[];
  playoffWeekStart: number;
  weeks?: number;
}) {
  if (!points.length) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">No games yet</span>
        <span className="snffl-placeholder-note">Scores appear once a week is final.</span>
      </div>
    );
  }

  const width = 320;
  const height = 120;
  const padLeft = 4;
  const padBottom = 16;
  const max = Math.max(...points.map((p) => p.points)) * 1.1 || 1;
  const colWidth = (width - padLeft * 2) / weeks;
  const barWidth = Math.max(4, colWidth * 0.6);

  const playoffX = padLeft + (playoffWeekStart - 1) * colWidth;

  return (
    <div className="snffl-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Points by week" className="snffl-chart-svg">
        {playoffWeekStart <= weeks ? (
          <rect
            className="snffl-chart-playoffs"
            x={playoffX}
            y={0}
            width={width - playoffX - padLeft}
            height={height - padBottom}
          />
        ) : null}

        {points.map((entry) => {
          const barHeight = ((height - padBottom) * entry.points) / max;
          const x = padLeft + (entry.week - 1) * colWidth + (colWidth - barWidth) / 2;
          return (
            <rect
              key={entry.week}
              className={entry.won ? 'snffl-chart-bar-win' : 'snffl-chart-bar-loss'}
              x={x}
              y={height - padBottom - barHeight}
              width={barWidth}
              height={Math.max(1, barHeight)}
            >
              <title>
                Week {entry.week}: {entry.points.toFixed(2)}
              </title>
            </rect>
          );
        })}

        <line
          className="snffl-chart-axis"
          x1={padLeft}
          y1={height - padBottom}
          x2={width - padLeft}
          y2={height - padBottom}
        />
      </svg>

      <div className="snffl-chart-legend">
        <span>Week 1</span>
        <span>Playoffs from {playoffWeekStart}</span>
        <span>Week {weeks}</span>
      </div>
    </div>
  );
}
