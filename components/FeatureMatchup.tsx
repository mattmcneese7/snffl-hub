import type { CSSProperties } from 'react';
import Link from 'next/link';

/**
 * Diagonal split card in both managers' colors.
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
  points: number;
  toPlay: number;
};

export type FeatureData = {
  label: string;
  week: number;
  matchupId: number;
  status: 'pending' | 'live' | 'final';
  margin: number;
  away: FeatureSide;
  home: FeatureSide;
};

function Side({ side }: { side: FeatureSide }) {
  const initials = (side.teamName || side.manager).slice(0, 2).toUpperCase();
  return (
    <div className="snffl-feature-side">
      {side.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="snffl-feature-side-avatar" src={side.avatarUrl} alt="" loading="lazy" />
      ) : (
        <span
          className="snffl-feature-side-avatar snffl-avatar-fallback"
          style={{ background: side.primary }}
        >
          {initials}
        </span>
      )}
      <div className="snffl-feature-side-team">{side.teamName}</div>
      <div className="snffl-feature-side-manager">{side.manager}</div>
      <div className="snffl-feature-side-score snffl-numeric">{side.points.toFixed(2)}</div>
    </div>
  );
}

export default function FeatureMatchup({ data }: { data: FeatureData }) {
  const { away, home, label, status, margin, week, matchupId } = data;
  const total = away.points + home.points;
  // Final games show share of points. Real win probability needs live
  // projections, which arrive with the live layer in Checkpoint 7.
  const awayShare = total > 0 ? Math.round((away.points / total) * 100) : 50;

  const statusText =
    status === 'pending' ? 'Not started' : status === 'live' ? 'Live' : 'Final';

  return (
    <Link
      className="snffl-card snffl-feature-matchup"
      href={`/matchups/${week}/${matchupId}`}
      style={
        {
          '--snffl-home-primary': home.primary,
          '--snffl-away-primary': away.primary,
        } as CSSProperties
      }
    >
      <div className="snffl-feature-matchup-split" />
      <div className="snffl-feature-matchup-body">
        <div className="snffl-feature-matchup-label">
          {label} &middot; {statusText}
          {status === 'pending' ? '' : ` · Margin ${margin.toFixed(2)}`}
        </div>

        <div className="snffl-feature-matchup-teams">
          <Side side={away} />
          <div className="snffl-feature-versus">VS</div>
          <Side side={home} />
        </div>

        <div className="snffl-winprob">
          <div className="snffl-winprob-bar">
            <div className="snffl-winprob-fill" style={{ width: `${awayShare}%` }} />
          </div>
          <div className="snffl-winprob-legend">
            <span>{awayShare}% OF POINTS</span>
            <span>{100 - awayShare}%</span>
          </div>
        </div>

        <div className="snffl-players-left">
          <span>{away.toPlay} to play</span>
          <span>{home.toPlay} to play</span>
        </div>
      </div>
    </Link>
  );
}
