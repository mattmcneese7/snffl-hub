import type { Outlook } from '@/lib/outlook';
import { readOf } from '@/lib/player-read';

/**
 * What to expect, and the working shown underneath it.
 *
 * The rule the Swami inherits from Squirt Says applies here first: every claim
 * is a real number and the number is on screen, so nobody has to take the
 * app's word for it. Where the model has him, the projection is its calibrated
 * one and the range is its real tenth-to-ninetieth percentile; where it does
 * not, the deterministic projection stands in and says so by omission.
 */
export default function PlayerOutlook({
  outlook,
  role,
  position,
  playerId = '',
}: {
  outlook: Outlook;
  role: string | null;
  position: string;
  playerId?: string;
}) {
  const { matchup, usage, trend, boomBust } = outlook;
  const moved = outlook.source === 'deterministic' && Math.abs(outlook.adjusted - outlook.base) >= 0.05;
  const shares = position === 'RB' ? 'carry' : 'target';
  const shareValue = position === 'RB' ? usage?.carryShare : usage?.targetShare;
  const read = readOf(outlook, playerId);

  return (
    <div className="snffl-card snffl-outlook">
      <div className="snffl-outlook-top">
        <div className="snffl-outlook-number">
          <span className="snffl-label">Projected</span>
          <strong>{outlook.adjusted.toFixed(1)}</strong>
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

      {/* The read, in the app's voice, wrapped around the boom and bust numbers
          the model computed. Only when the model has him. */}
      {read ? <p className="snffl-outlook-read">{read}</p> : null}

      {boomBust ? (
        <div className="snffl-outlook-odds">
          <span className="snffl-outlook-odd snffl-outlook-soft">
            <strong>{Math.round(boomBust.boom * 100)}%</strong>
            <span>boom · {boomBust.boomLine}+</span>
          </span>
          <span className="snffl-outlook-odd snffl-outlook-hard">
            <strong>{Math.round(boomBust.bust * 100)}%</strong>
            <span>bust · {boomBust.bustLine} or less</span>
          </span>
        </div>
      ) : null}

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

      {/* Where the number came from, said plainly. The model note doubles as
          the honesty line: it is a projection with a distribution, not a
          promise. The thin-data caveat only applies to the deterministic
          fallback, whose matchup rating really is built on two games. */}
      {outlook.source === 'model' ? (
        <p className="snffl-outlook-caveat">
          SQUIRT model, off {outlook.median?.toFixed(1)} median across the field it has seen.
          A projection, not a promise.
        </p>
      ) : outlook.confidence === 'thin' ? (
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
