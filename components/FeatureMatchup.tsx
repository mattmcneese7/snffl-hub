import Link from 'next/link';
import { LiveTeamPoints } from './LiveScores';
import ManagerLink from './ManagerLink';
import SourceMark from './SourceMark';
import WinBar from './WinBar';

/**
 * The matchup scoreboard: both managers, the broadcast score, projections and
 * win probability as two tubes of water.
 *
 * Replaced the diagonal split in both managers' colors, which read amateurish
 * once real color pairs landed on it. Manager color now lives where it cannot
 * fight the text: a ring on the avatar.
 *
 * Deliberately free of lib/league imports so it can render on the client too:
 * Your Matchup is client side, and reaching into lib/league from there would
 * pull the whole player file into the browser bundle.
 */
export type FeatureSide = {
  rosterId: number;
  teamName: string;
  manager: string;
  avatarUrl: string | null;
  primary: string;
  record: string;
  points: number;
  /** Sum of the starters' projections for the week. */
  projected: number | null;
  /** Where the model expects the side to finish, given what is left. */
  expected: number | null;
  /** 0 to 1, null when no model ran. */
  winProb: number | null;
  yetToPlay: number;
  inPlay: number;
  done: number;
};

export type FeatureData = {
  label: string;
  week: number;
  matchupId: number;
  status: 'pending' | 'live' | 'final';
  /** A starter is on the field right now, as opposed to sometime this week. */
  inPlay?: boolean;
  margin: number;
  away: FeatureSide;
  home: FeatureSide;
};

function Avatar({ side, size }: { side: FeatureSide; size: 'lg' | 'md' }) {
  const initials = (side.teamName || side.manager).slice(0, 2).toUpperCase();
  return (
    <span
      className={`snffl-board-avatar snffl-board-avatar-${size}`}
      style={{ ['--ring' as string]: side.primary }}
    >
      {side.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={side.avatarUrl} alt="" loading="lazy" />
      ) : (
        <span className="snffl-avatar-fallback" style={{ background: side.primary }}>
          {initials}
        </span>
      )}
    </span>
  );
}

function Side({
  side,
  align,
  leading,
  status,
  week,
}: {
  side: FeatureSide;
  align: 'left' | 'right';
  leading: boolean;
  status: FeatureData['status'];
  week: number;
}) {
  return (
    <div className={`snffl-board-side snffl-board-side-${align}`}>
      <div className="snffl-board-id">
        <Avatar side={side} size="lg" />
        <div className="snffl-board-names">
          <ManagerLink rosterId={side.rosterId} className="snffl-board-team">
            {side.teamName}
          </ManagerLink>
          <span className="snffl-board-manager">
            <ManagerLink rosterId={side.rosterId}>{side.manager}</ManagerLink>
            {side.record ? <span className="snffl-nowrap"> · {side.record}</span> : null}
          </span>
        </div>
      </div>
      <LiveTeamPoints
        rosterId={side.rosterId}
        week={week}
        fallback={side.points}
        className={`snffl-score-xl snffl-board-score${leading ? ' snffl-board-score-lead' : ''}`}
      />
      {status !== 'final' && side.projected != null ? (
        <span className="snffl-board-proj">
          <span className="snffl-board-proj-item">
            <span className="snffl-label">Proj</span>
            <b>{side.projected.toFixed(1)}</b>
          </span>
          {status === 'live' && side.expected != null ? (
            // Pace against projection is the only one of the two that says
            // something: running hot or running cold, coloured accordingly.
            <span
              className={`snffl-board-proj-item snffl-board-pace${
                side.expected >= side.projected ? ' snffl-board-pace-hot' : ' snffl-board-pace-cold'
              }`}
            >
              <span className="snffl-label">Pace</span>
              <b>{side.expected.toFixed(1)}</b>
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export default function FeatureMatchup({
  data,
  size = 'md',
  link = true,
}: {
  data: FeatureData;
  size?: 'md' | 'lg';
  link?: boolean;
}) {
  const { away, home, label, status, inPlay, week, matchupId } = data;
  const awayLead = status !== 'pending' && away.points > home.points;
  const homeLead = status !== 'pending' && home.points > away.points;
  const hasModel = away.winProb != null && home.winProb != null;

  const body = (
    <>
      {/* The header says why this card is here and stops. It used to append the
          status and then the margin: the status was already a pill an inch to
          the right, and the margin is the difference between two numbers set
          in the largest type on the screen. An empty label drops the row
          entirely, for the cards that sit directly under a section heading
          saying the same words. */}
      {label ? (
        <div className="snffl-board-top">
          <span className="snffl-label">{label}</span>
        </div>
      ) : null}

      <div className="snffl-board-sides">
        <Side side={away} align="left" leading={awayLead} status={status} week={week} />
        {/* Where a scoreboard keeps the clock. Floating it off to the right of
            the header left it attached to nothing. */}
        <span
          className={`snffl-board-mid snffl-board-mid-${
            inPlay ? 'live' : status === 'final' ? 'final' : 'pending'
          }`}
        >
          {inPlay ? (
            <>
              <span className="snffl-live-pill-dot" aria-hidden />
              LIVE
            </>
          ) : status === 'final' ? (
            'FINAL'
          ) : (
            'VS'
          )}
        </span>
        <Side side={home} align="right" leading={homeLead} status={status} week={week} />
      </div>

      {/* A decided game has nothing left to predict; 100 and 0 would be noise. */}
      {hasModel && status !== 'final' ? (
        <WinBar
          away={{ pct: away.winProb!, primary: away.primary, name: away.teamName }}
          home={{ pct: home.winProb!, primary: home.primary, name: home.teamName }}
        />
      ) : null}

      {status === 'final' ? null : (
        <div className="snffl-board-counts">
          <span>
            <strong>{away.yetToPlay}</strong> to play · <strong>{away.inPlay}</strong> playing
          </span>
          <span>
            <strong>{home.inPlay}</strong> playing · <strong>{home.yetToPlay}</strong> to play
          </span>
        </div>
      )}

      {hasModel && status !== 'final' ? (
        <div className="snffl-board-credit">
          <SourceMark source="snffl" label="Win probability" />
        </div>
      ) : null}
    </>
  );

  const className = `snffl-card snffl-board snffl-board-${size}`;
  return link ? (
    <div className={`${className} snffl-card-link`}>
      <Link
        className="snffl-card-link-cover"
        href={`/matchups/${week}/${matchupId}`}
        aria-label={`Open ${away.teamName} against ${home.teamName}`}
      />
      {body}
    </div>
  ) : (
    <div className={className}>{body}</div>
  );
}
