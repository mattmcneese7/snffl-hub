import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { playerOf, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getInsights } from '../../../lib/deep/load';
import type { DraftValueRow, UsageMove } from '../../../lib/deep/insights';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { managerOf, shortName, teamOf } from '../modules/shared';
import { Avatar, Empty, Face, Label, List, Row, Section, ui } from '../ui';
import l from '../modules/layout.module.css';

export const metadata: Metadata = { title: { absolute: 'Insights, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n < 0 ? `−${Math.abs(n).toFixed(2)}` : '0.00');
const record = (w: number, l: number, t: number) => `${w}-${l}${t ? `-${t}` : ''}`;
const weekSpan = (weeks: number[]) => (weeks.length === 1 ? `week ${weeks[0]}` : `weeks ${weeks[0]} to ${weeks[weeks.length - 1]}`);

/** A player row that opens the sheet: face, K. Cousins, a meta line, a number on the right. */
function PlayerRow({ id, meta, value, small, mine }: { id: string; meta?: string; value?: string; small?: string; mine?: boolean }) {
  const p = playerOf(id);
  return <Row data={{ player: id }} lead={<Face id={id} team={p.team} size={40} defense={p.position === 'DEF'} />} title={shortName(p.name, p.position, p.team)} strong={mine} sub={meta} value={value} valueSub={small} />;
}

/** A group's name over its rows. */
const Group = ({ children }: { children: string }) => (
  <span className={l.note}>
    <Label>{children}</Label>
  </span>
);
const Via = ({ children }: { children: ReactNode }) => <p className={`${ui.sub} ${l.note}`}>{children}</p>;

/**
 * Insights: what the league's own data says once it is added up. Draft
 * value, whose role is moving, what pickups have been worth, who the rest of
 * Sleeper is adding that nobody here has, and who has been lucky.
 */
export default async function V4Insights() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, ins] = await Promise.all([getV4Data(mine), getInsights()]);
  const { throughWeek, draft, pickups, usage, trending, luck } = ins;
  const bidding = pickups.some((p) => p.faabSpent != null);

  const draftRows = (rows: DraftValueRow[]) =>
    rows.map((r) => (
      <PlayerRow
        key={r.playerId}
        id={r.playerId}
        mine={r.rosterId === mine}
        meta={`Round ${r.round}, pick ${r.pickNo} · ${teamOf(r.rosterId)}`}
        value={`${r.position}${r.seasonRank}`}
        small={`Drafted ${r.position}${r.draftedRank}`}
      />
    ));
  const usageRows = (rows: UsageMove[]) =>
    rows.map((r) => (
      <PlayerRow
        key={r.playerId}
        id={r.playerId}
        mine={r.rosterId === mine}
        meta={[`${r.position} · ${teamOf(r.rosterId)}`, `Snaps ${pct(r.snapBefore)} to ${pct(r.snapNow)}`, r.targetNow || r.targetBefore ? `Targets ${pct(r.targetBefore)} to ${pct(r.targetNow)}` : null].filter(Boolean).join(' · ')}
      />
    ));

  return (
    <Shell data={data} active="league">
      <SectionHead icon="insights" word="insights" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />

      <Section title="Draft Value">
        {draft.steals.length || draft.busts.length ? (
          <>
            {draft.steals.length ? (
              <>
                <Group>Steals</Group>
                <List tap>{draftRows(draft.steals)}</List>
              </>
            ) : null}
            {draft.busts.length ? (
              <>
                <Group>Busts, Rounds 1 to 5</Group>
                <List tap>{draftRows(draft.busts)}</List>
              </>
            ) : null}
            <Via>Position rank by season points through week {throughWeek}, league scoring &middot; Sleeper</Via>
          </>
        ) : (
          <Empty>No finished weeks to rank the draft against yet.</Empty>
        )}
      </Section>

      <Section title="Usage">
        {usage && (usage.risers.length || usage.fallers.length) ? (
          <>
            {usage.risers.length ? (
              <>
                <Group>Rising</Group>
                <List tap>{usageRows(usage.risers)}</List>
              </>
            ) : null}
            {usage.fallers.length ? (
              <>
                <Group>Falling</Group>
                <List tap>{usageRows(usage.fallers)}</List>
              </>
            ) : null}
            <Via>
              Snaps and targets of rostered players, {weekSpan(usage.priorWeeks)} against {weekSpan(usage.recentWeeks)} &middot; nflverse
            </Via>
          </>
        ) : (
          <Empty>No rostered player&rsquo;s role has moved enough to call yet.</Empty>
        )}
      </Section>

      <Section title="Pickups">
        {pickups.length ? (
          <>
            <List tap>
              {pickups.map((p) => {
                const team = teamByRoster(p.rosterId);
                const best = p.best ? playerOf(p.best.playerId) : null;
                const meta = [managerOf(p.rosterId), `${p.adds} ${p.adds === 1 ? 'add' : 'adds'}`, bidding && p.faabSpent != null ? `$${p.faabSpent} FAAB` : null, best && p.best ? `Best: ${shortName(best.name, best.position, best.team)} ${p.best.points.toFixed(2)}` : null];
                return (
                  <Row
                    key={p.rosterId}
                    data={best ? { player: best.id } : undefined}
                    lead={<Avatar src={team?.avatarUrl} color={team?.colors?.primary} />}
                    title={teamOf(p.rosterId)}
                    strong={p.rosterId === mine}
                    sub={meta.filter(Boolean).join(' · ')}
                    value={p.startedPoints.toFixed(2)}
                    valueSub="Started"
                  />
                );
              })}
            </List>
            <Via>Started points from waiver claims and free agent adds, from the week added through week {throughWeek} &middot; Sleeper</Via>
          </>
        ) : (
          <Empty>No waiver claims or free agent adds yet.</Empty>
        )}
      </Section>

      <Section title="Trending Free Agents">
        {trending.length ? (
          <>
            <List tap>
              {trending.map((t) => {
                const p = playerOf(t.playerId);
                return <PlayerRow key={t.playerId} id={t.playerId} meta={[p.position, p.position === 'DEF' ? null : p.team].filter(Boolean).join(' · ')} value={t.count.toLocaleString('en-US')} small="Adds" />;
              })}
            </List>
            <Via>Adds in the last 24 hours across every Sleeper league, players nobody here rosters &middot; Sleeper</Via>
          </>
        ) : (
          <Empty>Nobody Sleeper is chasing is a free agent here.</Empty>
        )}
      </Section>

      <Section title="Luck">
        {luck.length ? (
          <>
            <List>
              {luck.map((r) => (
                <Row
                  key={r.rosterId}
                  title={teamOf(r.rosterId)}
                  strong={r.rosterId === mine}
                  sub={`${managerOf(r.rosterId)} · ${record(r.wins, r.losses, r.ties)}, all-play ${record(r.allPlayWins, r.allPlayLosses, r.allPlayTies)}`}
                  value={signed(r.luck)}
                  valueSub="Wins"
                />
              ))}
            </List>
            <Via>Wins less the wins each week&rsquo;s score earns against all {luck.length - 1} others &middot; Sleeper</Via>
          </>
        ) : (
          <Empty>Two finished weeks before luck means anything.</Empty>
        )}
      </Section>
    </Shell>
  );
}
