import { getStandings, getWeekGames, scoredWeek } from '@/lib/league';
import { readIssue } from '@/lib/rag';
import type { LineupSlot } from '@/lib/types';
import bench from '../../testing.module.css';
import Fly from './Fly';
import gouache from './grime/gouache.jpg';
import styles from './shart.module.css';

/**
 * Shart of the Week, the card. Locked: the grime (a painted gouache overlay
 * multiplied onto the glass) and the fly. The card is a native element, not a
 * weekly generated picture: a booking wall drawn in SVG, the manager's own
 * Sleeper avatar treated like a booking photo (or a mugshot silhouette when
 * they never set one), a placard in real type, and a charge sheet computed
 * from that week's lineup. Used by /shart and the composed Home.
 */

/** Could this bench player have filled that starting slot? */
function fits(slot: string, position: string) {
  if (slot === 'FLEX') return ['RB', 'WR', 'TE'].includes(position);
  if (slot === 'SUPER_FLEX') return ['QB', 'RB', 'WR', 'TE'].includes(position);
  if (slot === 'REC_FLEX') return ['WR', 'TE'].includes(position);
  if (slot === 'WRRB_FLEX') return ['RB', 'WR'].includes(position);
  return slot === position;
}

/** The bench player who most outscored a starter he could have replaced. */
function biggestBlunder(starters: LineupSlot[], benched: LineupSlot[]) {
  let best: { sat: LineupSlot; started: LineupSlot; cost: number } | null = null;
  for (const b of benched) {
    for (const s of starters) {
      const cost = b.points - s.points;
      if (cost > 0 && fits(s.slot, b.position) && (!best || cost > best.cost)) best = { sat: b, started: s, cost };
    }
  }
  return best;
}

const pts = (n: number) => n.toFixed(2);

/** The player's face, small, in front of his name in a charge. */
function Face({ p }: { p: LineupSlot }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.headshot} alt="" className={styles.face} loading="lazy" />;
}

/**
 * The week's Shart, worked out once for every card that shows it: the latest
 * week with a published, unretracted Shart story, its lowest scorer, who beat
 * them, and the charge sheet computed from that week's lineup.
 */
export async function getShart() {
  const current = await scoredWeek();
  let week = 0;
  let slug: string | null = null;
  for (let w = current; w >= 1 && !week; w--) {
    const story = readIssue(w)?.articles.find((a) => a.id === 'shart' && !a.retracted);
    if (story) {
      week = w;
      slug = story.slug;
    }
  }
  if (!week) return null;

  const [games, standings] = await Promise.all([getWeekGames(week), getStandings()]);
  const ranked = games
    .flatMap((g) => [
      { side: g.home, other: g.away },
      { side: g.away, other: g.home },
    ])
    .sort((a, b) => a.side.points - b.side.points);
  const { side, other } = ranked[0];
  const owner = standings.find((t) => t.rosterId === side.rosterId);

  const blunder = biggestBlunder(side.lineup, side.bench ?? []);
  const worst = [...side.lineup]
    .filter((p) => p.id !== blunder?.started.id)
    .sort((a, b) => a.points - b.points)[0];
  const hisBest = [...side.lineup].sort((a, b) => b.points - a.points)[0];
  const theirBest = [...other.lineup].sort((a, b) => b.points - a.points)[0];

  const charges: React.ReactNode[] = [];
  if (blunder) {
    charges.push(
      <>
        Started <Face p={blunder.started} />
        <b>{blunder.started.name}</b> ({pts(blunder.started.points)}) with <Face p={blunder.sat} />
        <b>{blunder.sat.name}</b> (
        {pts(blunder.sat.points)}) on the bench.
      </>,
    );
  }
  if (worst) {
    charges.push(
      <>
        <Face p={worst} />
        <b>{worst.name}</b>, {pts(worst.points)}. At {worst.slot === 'FLEX' ? 'flex' : worst.position}.
      </>,
    );
  }
  if (theirBest && hisBest && theirBest.points > hisBest.points) {
    charges.push(
      <>
        Outscored by <Face p={theirBest} />
        <b>{theirBest.name}</b> alone, {pts(theirBest.points)} to the best on this roster,{' '}
        {pts(hisBest.points)}.
      </>,
    );
  }

  return { week, slug, side, other, avatarUrl: owner?.avatarUrl ?? null, charges };
}

/**
 * `flow` lays the card out on the flow system (/flow): the shared
 * block header, 12px padding, and the sentence as the card's footer strip.
 */
export default async function ShartCard({ flow = false }: { flow?: boolean } = {}) {
  const shart = await getShart();
  if (!shart) return null;
  const { week, side, other, charges } = shart;
  const owner = { avatarUrl: shart.avatarUrl };

  return (
  <article className={`${styles.pane} ${flow ? styles.paneFlow : ''} ${bench.glassC}`} data-glass data-lift={1}>
    <div className={styles.grime} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={gouache.src} alt="" className={styles.overlay} />
    </div>

    <div className={flow ? styles.headFlow : styles.cardHead}>
      <span className={flow ? styles.titleFlow : styles.tag}>Shart of the Week</span>
      <span className={flow ? styles.metaFlow : styles.week}>Week {week}</span>
    </div>

    <div className={styles.booking}>
      <Mugshot
        avatarUrl={owner?.avatarUrl ?? null}
        manager={side.manager}
        week={week}
        score={side.points}
      />
      <div className={styles.sheet}>
        <span className={styles.team}>{side.team}</span>
        <span className={styles.meta}>
          Lost to {other.team}, {pts(other.points)} to {pts(side.points)}
        </span>
        <span className={styles.chargesLabel}>Charges</span>
        <ol className={styles.charges}>
          {charges.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      </div>
    </div>

    <p className={flow ? styles.stripFlow : styles.sentence}>Sentence: one chug</p>
    <Fly />
  </article>
  );
}

/**
 * A booking photo, built rather than generated: a height chart wall, the
 * avatar under a harsh flash, the league's grime over the lot, and a placard.
 * With no avatar set, the subject is the classic mugshot silhouette.
 */
function Mugshot({
  avatarUrl,
  manager,
  week,
  score,
}: {
  avatarUrl: string | null;
  manager: string;
  week: number;
  score: number;
}) {
  const marks = [
    { y: 18, label: '6′0″' },
    { y: 46, label: '5′6″' },
    { y: 74, label: '5′0″' },
    { y: 102, label: '4′6″' },
  ];
  return (
    <figure className={styles.mug}>
      <svg className={styles.wall} viewBox="0 0 116 148" preserveAspectRatio="none" aria-hidden>
        <rect width="116" height="148" fill="#e8e2d4" />
        {Array.from({ length: 21 }, (_, i) => (
          <line
            key={i}
            x1="0"
            x2="116"
            y1={4 + i * 7}
            y2={4 + i * 7}
            stroke="#2a2a2a"
            strokeOpacity={i % 4 === 2 ? 0.55 : 0.18}
            strokeWidth={i % 4 === 2 ? 0.9 : 0.5}
          />
        ))}
        {marks.map((m) => (
          <text key={m.y} x="4" y={m.y - 1.5} className={styles.wallLabel}>
            {m.label}
          </text>
        ))}
      </svg>

      <div className={styles.subject}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <svg viewBox="0 0 80 80" aria-hidden>
            <circle cx="40" cy="30" r="16" fill="#2f2c28" />
            <path d="M8 80 C10 58 24 50 40 50 C56 50 70 58 72 80 Z" fill="#2f2c28" />
          </svg>
        )}
      </div>

      {/* The same gouache grime as the frame, over the photo, plus the flash. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={gouache.src} alt="" className={styles.mugGrime} aria-hidden />
      <span className={styles.flash} aria-hidden />

      <figcaption className={styles.placard}>
        <span>SNFFL PD</span>
        <b>{manager}</b>
        <span className={styles.placardRow}>
          <span>Wk {week}</span>
          <span>{score.toFixed(2)}</span>
        </span>
      </figcaption>
    </figure>
  );
}
