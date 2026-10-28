import { List, Row, Section } from '../ui';
import { pickWeek, seasonStandings, weekPicks } from '../pickem/store';
import { managerOf } from './shared';

const LOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Pick'em on Home, in the slot the chug row had: one row that says where the
 * week's picks stand for you (make them, they're in, locked, or how last
 * week ended) and opens Pick'em.
 */
export default async function PickemRow({ state, week, mine }: { state: 'final' | 'preview' | 'live'; week: number; mine: number | null }) {
  const pw = await pickWeek(state, week);
  const w = await weekPicks(pw).catch(() => null);
  if (!w?.configured || !w.games.length) return null;
  const lock = w.lockAt ? LOCK.format(new Date(w.lockAt)) : null;
  const inNow = mine != null && w.inRosters.includes(mine);
  let title: string;
  let sub: string;
  if (!w.locked) {
    title = inNow ? 'Your picks are in' : 'Make your picks';
    sub = `${lock ? `Locks ${lock} · ` : ''}${w.inRosters.length} of 14 teams in`;
  } else {
    const last = state === 'final' ? (await seasonStandings(week).catch(() => null))?.lastWinner : null;
    title = last && last.week === week ? `${last.rosterIds.map(managerOf).join(' and ')} won week ${week}` : 'Picks are locked';
    sub = last && last.week === week ? `${last.correct} of ${last.of} right` : 'See how the league picked';
  }
  return (
    <Section title="Pick'em">
      <List tap>
        <Row href="/pickem" label={`Week ${pw} Picks`} title={title} sub={sub} />
      </List>
    </Section>
  );
}
