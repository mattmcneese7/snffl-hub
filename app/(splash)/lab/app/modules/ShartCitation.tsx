import Link from 'next/link';
import { getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';
import { readIssue } from '@/lib/rag';
import type { LineupSlot } from '@/lib/types';
import AwardIcon from './AwardIcon';
import { managerOf, shortName } from './shared';
import s from '../v4.module.css';
import c from './citation.module.css';

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
  for (const b of benched)
    for (const st of starters) {
      const cost = b.points - st.points;
      if (cost > 0 && fits(st.slot, b.position) && (!best || cost > best.cost)) best = { sat: b, started: st, cost };
    }
  return best;
}

const pts = (n: number) => n.toFixed(2);
const nm = (p: LineupSlot) => shortName(p.name, p.position, p.team);

/**
 * Shart of the Week, as a citation: the latest week with a published Shart
 * story, its lowest score, who beat them, and the charges worked out from
 * that lineup. The sentence is always one chug.
 */
export default async function ShartCitation() {
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
  const games = await getWeekGames(week).catch(() => []);
  const ranked = games.flatMap((g) => [{ side: g.home, other: g.away }, { side: g.away, other: g.home }]).sort((a, b) => a.side.points - b.side.points);
  if (!ranked.length) return null;
  const { side, other } = ranked[0];
  const team = teamByRoster(side.rosterId);
  const blunder = biggestBlunder(side.lineup, side.bench ?? []);
  const worst = [...side.lineup].filter((p) => p.id !== blunder?.started.id).sort((a, b) => a.points - b.points)[0];
  const hisBest = [...side.lineup].sort((a, b) => b.points - a.points)[0];
  const theirBest = [...other.lineup].sort((a, b) => b.points - a.points)[0];
  const charges: string[] = [];
  if (blunder) charges.push(`Started ${nm(blunder.started)} (${pts(blunder.started.points)}) with ${nm(blunder.sat)} (${pts(blunder.sat.points)}) on the bench.`);
  if (worst) charges.push(`${nm(worst)}, ${pts(worst.points)} at ${worst.slot === 'FLEX' ? 'flex' : worst.position}.`);
  if (theirBest && hisBest && theirBest.points > hisBest.points)
    charges.push(`Outscored by ${nm(theirBest)} alone, ${pts(theirBest.points)} to this roster's best, ${pts(hisBest.points)}.`);

  return (
    <section aria-label={`Week ${week} Shart of the Week`}>
      <div className={s.title}>
        <h2>Shart of the Week</h2>
        {slug ? <Link href={`/lab/app/rag/${week}/${slug}`}>The story</Link> : null}
      </div>
      <article className={c.ticket}>
        <div className={c.top}>
          <span>Citation</span>
          <span>Week {week}</span>
        </div>
        <div className={c.issued}>
          <span className={s.av} style={{ width: 40, height: 40, ['--mgr' as string]: team?.colors?.primary }}>
            {team?.avatarUrl ? <img src={team.avatarUrl} alt="" /> : null}
          </span>
          <span className={s.who}>
            <b>{side.team}</b>
            <small>{managerOf(side.rosterId) || side.manager} &middot; Lowest score of the week</small>
          </span>
          <span className={c.score}>{pts(side.points)}</span>
        </div>
        <p className={c.lost}>
          Lost to {other.team}, {pts(other.points)} to {pts(side.points)}.
        </p>
        {charges.length ? (
          <>
            <span className={c.label}>Charges</span>
            <ol className={s.numbered}>
              {charges.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </>
        ) : null}
        <div className={c.sentence}>
          <AwardIcon kind="shart" size={32} />
          <span>
            <span className={c.label}>Sentence</span>
            <b>One chug</b>
          </span>
          <Link href="/lab/app/chug" className={s.chipA}>
            Chug Meter
          </Link>
        </div>
      </article>
    </section>
  );
}
