/**
 * A number, set the way the references set them.
 *
 * The pattern is the same in all of them: a small label above, the figure
 * itself with its unit smaller and lifted, the decimals a step quieter than
 * the integer, and a coloured delta underneath. It reads as designed data
 * rather than bold text, and it is the single biggest change available to an
 * app whose whole job is showing scores.
 */
export function Figure({
  value,
  unit,
  size = 'md',
  className = '',
}: {
  /** Already rounded by the caller, so this never invents precision. */
  value: string;
  /** "pts", "%", "$". Set small and lifted, before or after by convention. */
  unit?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  // Split on the decimal point so the fraction can be quieted. Without this a
  // score is one blob of digits and the eye has to do the parsing.
  const [whole, fraction] = value.split('.');
  return (
    <span className={`snffl-figure snffl-figure-${size} ${className}`.trim()}>
      {unit === '%' || unit === '$' ? <i className="snffl-figure-unit">{unit}</i> : null}
      <span className="snffl-figure-whole">{whole}</span>
      {fraction ? <span className="snffl-figure-fraction">.{fraction}</span> : null}
      {unit && unit !== '%' && unit !== '$' ? <i className="snffl-figure-unit">{unit}</i> : null}
    </span>
  );
}

export default function Stat({
  label,
  value,
  unit,
  delta,
  direction,
  size = 'md',
  tone = 'plain',
}: {
  label: string;
  value: string;
  unit?: string;
  /** The line under the figure: "+13,750 this week", "3 yet to play". */
  delta?: string;
  direction?: 'up' | 'down' | 'flat';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** One tile in a group carries the accent. The rest stay plain. */
  tone?: 'plain' | 'accent';
}) {
  return (
    <div className={`snffl-stat snffl-stat-${tone}`}>
      <span className="snffl-stat-label">{label}</span>
      <Figure value={value} unit={unit} size={size} />
      {delta ? (
        <span className={`snffl-stat-delta${direction ? ` snffl-stat-delta-${direction}` : ''}`}>
          {direction === 'up' ? '↑ ' : direction === 'down' ? '↓ ' : ''}
          {delta}
        </span>
      ) : null}
    </div>
  );
}
