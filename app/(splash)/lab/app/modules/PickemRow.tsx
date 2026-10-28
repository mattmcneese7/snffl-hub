import { teamByRoster, teams } from '@/lib/league';
import { Avatar, Card, Label, List, Row, Section, ui } from '../ui';
import p from '../ui/blocks/Pick.module.css';
import { pickWeek, seasonStandings, weekPicks } from '../pickem/store';
import { managerOf } from './shared';

const LOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Pick'em on Home, in the slot the chug row had: where the week's picks stand
 * for you (make them, they're in, locked, or how last week ended), opening
 * Pick'em. Midweek, before the lock, it is `prominent` (Matt, 2026-10-28): a
 * full card at the top of Home with who is in, so nobody misses the window.
 */
export default async function PickemRow({ state, week, mine, prominent = false }: { state: 'final' | 'preview' | 'live'; week: number; mine: number | null; prominent?: boolean }) {
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
  if (prominent && !w.locked) {
    const out = teams.filter((t) => !w.inRosters.includes(t.rosterId));
    return (
      <Section title="Pick'em">
        <Card href="/pickem">
          <Label>{`Week ${pw} Picks${lock ? ` · Locks ${lock}` : ''}`}</Label>
          <span className={ui.value}>{title}</span>
          <span className={ui.sub}>
            {w.inRosters.length} of {teams.length} teams in
            {out.length && out.length <= 4 ? ` · Still out: ${out.map((t) => managerOf(t.rosterId)).join(', ')}` : ''}
          </span>
          {w.inRosters.length ? (
            <span className={p.faces} aria-label={`In: ${w.inRosters.map((id) => managerOf(id)).join(', ')}`}>
              {w.inRosters.map((id) => {
                const t = teamByRoster(id);
                return <Avatar key={id} src={t?.avatarUrl} color={t?.colors?.primary} size={26} />;
              })}
            </span>
          ) : null}
        </Card>
      </Section>
    );
  }
  return (
    <Section title="Pick'em">
      <List tap>
        <Row href="/pickem" label={`Week ${pw} Picks`} title={title} sub={sub} />
      </List>
    </Section>
  );
}
