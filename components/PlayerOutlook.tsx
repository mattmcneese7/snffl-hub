import type { Outlook } from '@/lib/outlook';

/**
 * What to expect, and the working shown underneath it.
 *
 * The rule the Swami inherits from Squirt Says applies here first: every claim
 * is a real number and the number is on screen, so nobody has to take the
 * app's word for it. That is why the unadjusted projection sits next to the
 * adjusted one rather than being replaced by it, and why a thin sample says so
 * in plain words instead of being quietly rounded into confidence.
 */
export default function PlayerOutlook({
  outlook,
  role,
  position,
}: {
  outlook: Outlook;
  role: string | null;
  position: string;
}) {
  const { matchup, usage, trend } = outlook;
  const moved = Math.abs(outlook.adjusted - outlook.base) >= 0.05;
  const shares = position === 'RB' ? 'carry' : 'target';
  const shareValue = position === 'RB' ? usage?.carryShare : usage?.targetShare;

  return (
    <div className="snffl-card snffl-outlook">
      <div className="snffl-outlook-top">
        <div className="snffl-outlook-number">
          <span className="snffl-label">Projected</span>
          <strong>{outlook.adjusted.toFixed(2)}</strong>
          <span className="snffl-outlook-range">
            {outlook.floor.toFixed(1)} to {outlook.ceiling.toFixed(1)}
          </span>
        </div>

        {matchup ? (
          <div className={`snffl-outlook-matchup snffl-outlook-${matchup.label}`}>
            <span className="snffl-label">{matchup.home ? 'vs' : 'at'} {matchup.opponent}</span>
            <strong>{matchup.label}</strong>
            <span className="snffl-outlook-rank">
              {ordinal(matchup.rank)} most conceded to {position}
            </span>
          </div>
        ) : null}
      </div>

      {/* The working. A projection that moved should say what moved it and by
          how much, or it is just a different number with no argument behind
          it. */}
      {moved ? (
        <p className="snffl-outlook-working">
          {outlook.base.toFixed(2)} before the matchup, {matchup?.opponent} concedes{' '}
          {matchup?.conceded.toFixed(1)} a game to the position.
        </p>
      ) : null}

      {role || usage ? (
        <div className="snffl-outlook-usage">
          {role ? <span className="snffl-outlook-role">{role}</span> : null}
          {usage ? (
            <>
              <Chip label="snaps" value={pct(usage.snapShare)} />
              {shareValue ? <Chip label={shares} value={pct(shareValue)} /> : null}
              {usage.redZone ? <Chip label="red zone" value={`${usage.redZone}/g`} /> : null}
              {trend && trend !== 'steady' ? <Chip label="usage" value={trend} /> : null}
            </>
          ) : null}
        </div>
      ) : null}

      {outlook.ahead.length ? (
        <div className="snffl-outlook-ahead">
          <span className="snffl-label">Coming up</span>
          {outlook.ahead.map((f) => (
            <span key={f.week} className={`snffl-outlook-fx snffl-outlook-${f.label}`}>
              {f.home ? '' : '@'}
              {f.opponent}
            </span>
          ))}
        </div>
      ) : null}

      {/* Said out loud rather than buried. Two games of defensive data is not
          a read on a defence, and a number that does not admit that is worse
          than no number. */}
      {outlook.confidence === 'thin' ? (
        <p className="snffl-outlook-caveat">
          Defensive ratings are {Math.round(outlook.weight * 100)} percent applied this early.
          Two games is not a read on a defence yet.
        </p>
      ) : null}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="snffl-outlook-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
