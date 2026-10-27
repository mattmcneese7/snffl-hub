import { getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';
import { readIssue } from '@/lib/rag';
import type { LineupSlot } from '@/lib/types';
import AwardIcon from './AwardIcon';
import { managerOf, shortName } from './shared';
import { Avatar, List, Pill, Rank, Row, Section, ui } from '../ui';
import l from './layout.module.css';

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
 * that lineup. The sentence is always one chug. On the Chug Meter, which
 * already names who owes, it keeps to the charges and the sentence.
 */
export default async function ShartCitation({ onChug = false }: { onChug?: boolean }) {
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
    <Section title="Shart of the Week" label={`Week ${week} Shart of the Week`} action={slug ? { href: `/lab/app/rag/${week}/${slug}`, label: 'The story' } : undefined}>
      {!onChug ? (
        <>
          <List>
            <Row lead={<Avatar src={team?.avatarUrl} color={team?.colors?.primary} size={44} />} label={`Week ${week}`} title={side.team} strong sub={`${managerOf(side.rosterId) || side.manager} · Lowest score of the week`} value={pts(side.points)} />
          </List>
          <p className={`${ui.sub} ${l.note}`}>
            Lost to {other.team}, {pts(other.points)} to {pts(side.points)}.
          </p>
        </>
      ) : null}
      {charges.length ? (
        <List>
          {charges.map((x, i) => (
            <Row key={x} lead={<Rank n={i + 1} />} label={i === 0 ? 'Charges' : undefined} title={x} />
          ))}
        </List>
      ) : null}
      <List>
        <Row lead={<AwardIcon kind="shart" size={14} />} label="Sentence" title="One chug" strong trail={!onChug ? <Pill href="/lab/app/chug" kind="secondary">Chug Meter</Pill> : undefined} />
      </List>
    </Section>
  );
}
