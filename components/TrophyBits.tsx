import type { Award, TrophyKey } from '@/lib/trophies';
import ManagerLink from './ManagerLink';
import Trophy, { TROPHIES } from './Trophy';

/** The hardware a team holds right now, as small medals beside its name. */
export function TrophyBadges({ kinds, size = 18 }: { kinds?: TrophyKey[]; size?: number }) {
  if (!kinds?.length) return null;
  return (
    <span className="snffl-trophy-badges">
      {kinds.map((kind) => (
        <Trophy key={kind} kind={kind} size={size} title={`Holds ${TROPHIES[kind].name}`} />
      ))}
    </span>
  );
}

/** This week's hardware, one card per award with its winner. */
export function HardwareStrip({
  awards,
  names,
}: {
  awards: Award[];
  /** Roster id to first name. */
  names: Record<number, string>;
}) {
  return (
    <div className="snffl-hardware">
      {awards.map((award) => (
        <div className={`snffl-hardware-card snffl-hardware-${award.kind}`} key={award.kind}>
          <Trophy kind={award.kind} size={56} />
          <span className="snffl-hardware-name">{TROPHIES[award.kind].name}</span>
          <ManagerLink rosterId={award.rosterId} className="snffl-hardware-winner">
            {names[award.rosterId] ?? `Roster ${award.rosterId}`}
          </ManagerLink>
          <span className="snffl-hardware-detail">{award.detail}</span>
        </div>
      ))}
    </div>
  );
}

/** A manager's trophy case: every award he has won, with counts and weeks. */
export function TrophyCase({ awards }: { awards: Award[] }) {
  const order: TrophyKey[] = ['champion', 'motw', 'blowout', 'squeaker', 'lucky', 'heartbreaker', 'bench', 'shart', 'plunger'];
  const won = order
    .map((kind) => ({ kind, list: awards.filter((a) => a.kind === kind) }))
    .filter((entry) => entry.list.length);
  if (!won.length) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">Empty shelf</span>
        <span className="snffl-placeholder-note">No hardware yet. Every final week hands out seven.</span>
      </div>
    );
  }
  return (
    <div className="snffl-trophy-shelf">
      {won.map(({ kind, list }) => (
        <div className="snffl-trophy-slot" key={kind}>
          <span className="snffl-trophy-slot-art">
            <Trophy kind={kind} size={64} />
            {list.length > 1 ? <span className="snffl-trophy-slot-count">×{list.length}</span> : null}
          </span>
          <span className="snffl-trophy-slot-name">{TROPHIES[kind].name}</span>
          <span className="snffl-trophy-slot-weeks">
            {list.map((a) => (a.week ? `Wk ${a.week}` : 'Season')).join(', ')}
          </span>
        </div>
      ))}
    </div>
  );
}
