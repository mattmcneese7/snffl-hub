import ManagerLink from './ManagerLink';

/**
 * Stacked beer bar graph, Brief Section 2.
 *
 * X axis is every manager, Y axis counts chugs. One beer per weekly lowest
 * score. Columns sort most to fewest. Names sit at an angle on phones so all
 * 14 fit, and flat on desktop.
 *
 * Colors come from classes, never from CSS variables inside SVG presentation
 * attributes, per Brief Section 4 rule 6.
 */
export type ChugColumn = {
  rosterId: number;
  manager: string;
  teamName: string;
  count: number;
  weeks: number[];
};

function Beer({ index }: { index: number }) {
  return (
    <span className="snffl-beer" title={`Beer ${index + 1}`}>
      <svg viewBox="0 0 24 30" role="img" aria-hidden="true" className="snffl-beer-svg">
        <path className="snffl-beer-glass" d="M4 8h16l-1.5 20a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2Z" />
        <path className="snffl-beer-foam" d="M4 8c0-3 3-5 8-5s8 2 8 5c-2 1-4 0-5.5 0.8C12.5 9.8 10 7.8 8 8.4 6.6 8.8 5.2 8.6 4 8Z" />
        <circle className="snffl-beer-bubble" cx="10" cy="17" r="1.4" />
        <circle className="snffl-beer-bubble" cx="14.5" cy="21" r="1" />
        <circle className="snffl-beer-bubble" cx="11" cy="24" r="0.9" />
      </svg>
    </span>
  );
}

export default function ChugMeter({ columns }: { columns: ChugColumn[] }) {
  const max = Math.max(1, ...columns.map((c) => c.count));

  return (
    <div className="snffl-chug">
      <div className="snffl-chug-plot" style={{ '--snffl-chug-max': max } as React.CSSProperties}>
        {columns.map((column) => (
          <div className="snffl-chug-column" key={column.rosterId}>
            <div className="snffl-chug-stack">
              {column.count === 0 ? (
                <span className="snffl-chug-empty" aria-hidden />
              ) : (
                Array.from({ length: column.count }, (_, i) => <Beer index={i} key={i} />)
              )}
            </div>
            <span className="snffl-chug-count snffl-numeric">{column.count}</span>
            <ManagerLink rosterId={column.rosterId} className="snffl-chug-name">
              {column.manager}
            </ManagerLink>
          </div>
        ))}
      </div>
      <p className="snffl-chug-axis-note">
        One beer for every week finishing with the lowest score.
      </p>
    </div>
  );
}
