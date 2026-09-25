import LabHeader from '../LabHeader';
import LabTabs from '../LabTabs';

/**
 * A matchup, proposed. Week 2, Matt against Adam, the real lineups and the
 * real 0.66 point margin.
 *
 * What changed: one scoreline instead of two stacked cards, a share of points
 * bar so the state of the game reads without arithmetic, and a lineup that
 * gives a player his face and his points and nothing else. Matt's rule from
 * September: visual fidelity over stat density. Everything a row used to
 * carry, projection, floor, ceiling, opponent, moves to the player's own page.
 */
type Slot = { slot: string; name: string; points: number; out?: boolean };

const HOME: Slot[] = [
  { slot: 'QB', name: 'J. Goff', points: 24.86 },
  { slot: 'RB', name: 'B. Robinson', points: 18.4 },
  { slot: 'RB', name: 'J. Cook', points: 12.1 },
  { slot: 'WR', name: 'A. St. Brown', points: 35.2 },
  { slot: 'WR', name: 'J. Waddle', points: 9.8 },
  { slot: 'TE', name: 'I. Likely', points: 7.4 },
  { slot: 'FLEX', name: 'C. Skattebo', points: 11.3 },
  { slot: 'K', name: 'H. Butker', points: 6.0 },
  { slot: 'DEF', name: 'Broncos', points: 5.02 },
];

const AWAY: Slot[] = [
  { slot: 'QB', name: 'B. Purdy', points: 28.48 },
  { slot: 'RB', name: 'D. Swift', points: 14.2 },
  { slot: 'RB', name: 'T. Etienne', points: 9.6 },
  { slot: 'WR', name: 'J. Smith-Njigba', points: 42.5 },
  { slot: 'WR', name: 'G. Pickens', points: 11.1 },
  { slot: 'TE', name: 'T. Higgins', points: 8.2 },
  { slot: 'FLEX', name: 'M. Nabers', points: 6.3 },
  { slot: 'K', name: 'C. Boswell', points: 4.0 },
  { slot: 'DEF', name: 'Jets', points: 5.02, out: true },
];

const initials = (name: string) => name.replace(/[^A-Za-z. ]/g, '').split(' ').slice(-1)[0].slice(0, 2).toUpperCase();

function Lineup({ rows }: { rows: Slot[] }) {
  return (
    <div className="lab-card">
      {rows.map((row) => (
        <div className={`lab-slot${row.out ? ' lab-slot-out' : ''}`} key={row.slot + row.name}>
          <span className="lab-slot-face">{initials(row.name)}</span>
          <span className="lab-slot-who">
            <span className="lab-slot-name">{row.name}</span>
            <span className="lab-slot-pos">{row.slot}{row.out ? ' · OUT' : ''}</span>
          </span>
          <span className="lab-num lab-slot-points">{row.points.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function LabMatchup() {
  const home = 130.08;
  const away = 129.42;
  const share = (home / (home + away)) * 100;

  return (
    <>
      <div className="lab-page">
        <LabHeader section="Matchup" week={2} />

        <section className="lab-section">
          <div className="lab-card">
            <div className="lab-scoreline">
              <span className="lab-display lab-scoreline-name">Matt</span>
              <span className="lab-scoreline-mid">
                <span className="lab-chip lab-chip-win">Final</span>
              </span>
              <span className="lab-display lab-scoreline-name" style={{ textAlign: 'right' }}>
                Adam
              </span>
            </div>
            <div className="lab-scoreline" style={{ paddingTop: 0 }}>
              <span className="lab-num lab-scoreline-score">{home.toFixed(2)}</span>
              <span className="lab-label">0.66</span>
              <span className="lab-num lab-scoreline-score" style={{ textAlign: 'right' }}>
                {away.toFixed(2)}
              </span>
            </div>
            {/* Who has how much of the points on the board, without arithmetic. */}
            <div style={{ padding: '0 14px 16px' }}>
              <div className="lab-bar">
                <span style={{ width: `${share}%` }} />
              </div>
            </div>
          </div>
        </section>

        <div className="lab-columns">
          <section className="lab-section">
            <span className="lab-label">Matt</span>
            <Lineup rows={HOME} />
          </section>
          <section className="lab-section">
            <span className="lab-label">Adam</span>
            <Lineup rows={AWAY} />
          </section>
        </div>
      </div>
      <LabTabs active="Matchup" />
    </>
  );
}
