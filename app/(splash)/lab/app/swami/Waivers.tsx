import type { ReactNode } from 'react';
import { firstNameOf } from '@/config/managers';
import { league, teams } from '@/lib/league';
import { parseTeam } from '@/lib/my-team';
import { windowLabel, type RosRead } from '@/lib/rest-of-season';
import { getLeague, type SleeperRoster } from '@/lib/sleeper';
import type { UsageEntry } from '@/lib/spine';
import { candidatePool, waiversForTeam, waiversLeagueWide } from '@/lib/waivers';
import { qv, swamiHref, type SwamiQuery } from '../../../swami/moves-query';
import { rosBoard } from '../cached';
import { Card, Chip, Chips, Drawer, Empty, List, Pill, Rail, Row, Section, Stats, Tag, ui as u } from '../ui';
import { ExpandRow } from '../ui/blocks/ExpandRow';
import { FilterSheet } from '../ui/blocks/FilterSheet';
import StatGrid from '../players/StatGrid';
import CopyMove from './CopyMove';
import { BASE, curl, fmt, PlayerFace, PlayerSub, RosMethod, RosWorking, short, tabbed } from './parts';
import w from './swami.module.css';

/**
 * Waivers. With a team (the URL's, else yours) it ranks every unrostered
 * player by what he adds to that team's best lineup, names the starter he
 * pushes out, and copies the claim. With the league picked it is the
 * league's board: who would start for the most teams. Team and position
 * live in the URL (team, wpos).
 */

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teams.find((t) => t.rosterId === rosterId)?.manager ?? `Team ${rosterId}`;

type FullRoster = SleeperRoster & { reserve?: string[] | null; taxi?: string[] | null };

/** Snap share, and the recent games when they moved. */
function usageItems(usage: UsageEntry | null, trend: string | null, position: string) {
  if (position === 'K' || position === 'DEF' || !usage) return [];
  const items = [{ value: pct(usage.snapShare), label: 'Snaps' }];
  if (usage.recent && trend && trend !== 'steady') items.push({ value: pct(usage.recent.snapShare), label: `Last ${usage.recent.weeks}, ${trend}` });
  return items;
}

/** One pickup: a row with what he adds; open it for the numbers, the claim and the working. */
function Pick({ read, value, label, stats, note, move }: { read: RosRead; value: string; label: string; stats: { value: ReactNode; label: string }[]; note?: string; move: string }) {
  return (
    <ExpandRow lead={<PlayerFace read={read} />} title={short(read.player.name, read.player.position)} sub={<PlayerSub read={read} />} value={value} valueSub={label}>
      <StatGrid items={stats} />
      {note ? <p className={`${u.sub} ${w.note}`}>{note}</p> : null}
      <CopyMove text={move} label="Copy claim" />
      <RosWorking read={read} />
      <Pill href={`/players/${read.player.id}`} kind="secondary">
        Player page
      </Pill>
    </ExpandRow>
  );
}

export default async function Waivers({ query, mine }: { query: SwamiQuery; mine: number | null }) {
  const [{ ctx, rosters, readOf, unrostered }, sleeperLeague] = await Promise.all([rosBoard(), getLeague().catch(() => null)]);

  // A team in the URL wins, so a pasted link shows what its sender saw. With
  // none, this device's team, and with no team picked, the league.
  const raw = qv(query, 'team');
  const team: number | null = raw === 'league' ? null : (parseTeam(raw) ?? mine ?? null);
  const posRaw = qv(query, 'wpos');
  const pos = posRaw && POSITIONS.includes(posRaw) ? posRaw : null;

  const pool = candidatePool(
    unrostered.map((p) => readOf(p.id)),
    pos,
  );
  const readsFor = (rosterId: number) => (rosters.find((r) => r.roster_id === rosterId)?.players ?? []).map(readOf);
  const teamView = team ? waiversForTeam({ rosterId: team, roster: readsFor(team), pool, ctx }) : null;
  const leagueView = team
    ? null
    : waiversLeagueWide({ rosters: rosters.map((r) => ({ rosterId: r.roster_id, reads: (r.players ?? []).map(readOf) })), pool, ctx });
  const weakSlots = new Set((teamView?.picks ?? []).slice(0, 3).flatMap((p) => (p.replaces ? [p.replaces.read.player.id] : [])));

  // Whether a claim needs a drop: injured reserve and taxi don't count.
  const roster = team ? (rosters.find((r) => r.roster_id === team) as FullRoster | undefined) : undefined;
  const held = new Set([...(roster?.reserve ?? []), ...(roster?.taxi ?? [])]);
  const active = (roster?.players ?? []).filter((id) => !held.has(id));
  const capacity = league.rosterPositions.filter((p) => p !== 'IR' && p !== 'TAXI').length;
  const full = active.length >= capacity;

  // FAAB: what the league starts with and what this team has spent.
  const budget = Number((sleeperLeague?.settings as Record<string, unknown> | undefined)?.waiver_budget ?? 0);
  const spent = Number(roster?.settings?.waiver_budget_used ?? 0);
  const left = budget ? Math.max(0, budget - spent) : null;

  const teamHref = (t: number | 'league') => tabbed(swamiHref(query, { team: String(t) }, BASE), 'waivers');
  const posHref = (p: string | null) => tabbed(swamiHref(query, { team: team ? String(team) : 'league', wpos: p }, BASE), 'waivers');
  const ordered = [...teams].sort((x, y) => Number(y.rosterId === mine) - Number(x.rosterId === mine));
  const window = windowLabel(ctx);

  return (
    <>
      <div className={w.taps}>
        <Rail label="Waiver filters">
          <FilterSheet id="waiver-team" label={team ? managerOf(team) : 'League'} title="Pickups For">
            <Card>
              <Chips label="Team">
                <Chip href={teamHref('league')} on={!team}>
                  League
                </Chip>
                {ordered.map((t) => (
                  <Chip key={t.rosterId} href={teamHref(t.rosterId)} on={t.rosterId === team}>
                    {managerOf(t.rosterId)}
                  </Chip>
                ))}
              </Chips>
            </Card>
          </FilterSheet>
          {[null, ...POSITIONS].map((p) => (
            <Chip key={p ?? 'all'} href={posHref(p)} on={pos === p}>
              {p ?? 'All'}
            </Chip>
          ))}
        </Rail>
      </div>

      {teamView ? (
        <>
          <Card>
            {teamView.line ? (
              <p className={u.bodyText}>{curl(teamView.line)}</p>
            ) : (
              <p className={u.bodyText}>
                Nothing unrostered{pos ? ` at ${pos}` : ''} improves {teamView.teamName}&rsquo;s best lineup in any week from {ctx.from} to {ctx.through}.
              </p>
            )}
            {left != null ? (
              <Stats
                items={[
                  { value: `$${left}`, label: `FAAB left of $${budget}` },
                  { value: full ? 'Full' : 'Open spot', label: full ? 'Roster, a drop is owed' : 'Roster' },
                ]}
              />
            ) : null}
          </Card>
          {teamView.picks.length ? (
            <Section title="Best Adds">
              <List tap>
                {teamView.picks.map((p) => (
                  <Pick
                    key={p.read.player.id}
                    read={p.read}
                    value={`+${fmt(p.rosGain)}`}
                    label="Lineup gain"
                    stats={[
                      { value: p.perGame > 0 ? `+${fmt(p.perGame)}` : 'Spot starts', label: 'Per game' },
                      ...(p.thisWeek != null ? [{ value: p.thisWeek > 0 ? `+${fmt(p.thisWeek)}` : 'No help', label: 'This week' }] : []),
                      ...usageItems(p.usage, p.trend, p.read.player.position),
                    ]}
                    note={p.replaces ? `Starts over ${short(p.replaces.read.player.name, p.replaces.read.player.position)} at ${p.replaces.slot}.` : undefined}
                    move={`Claim ${short(p.read.player.name, p.read.player.position)}.${
                      p.replaces ? ` Starts over ${short(p.replaces.read.player.name, p.replaces.read.player.position)} at ${p.replaces.slot}.` : ''
                    }${full ? ' Roster is full, so a drop is owed.' : ''}`}
                  />
                ))}
              </List>
            </Section>
          ) : null}
          <Drawer title={`${teamView.teamName} Lineup`} value="Per game">
            {teamView.lineup.map((slot, i) => (
              <Row
                key={`${slot.slot}-${i}`}
                lead={
                  <span className={w.slot}>
                    <Tag>{slot.slot === 'SUPER_FLEX' ? 'SF' : slot.slot}</Tag>
                  </span>
                }
                title={slot.read ? short(slot.read.player.name, slot.read.player.position) : 'Empty'}
                muted={!slot.read}
                sub={slot.id && weakSlots.has(slot.id) ? 'A top pickup starts over him' : undefined}
                value={fmt(slot.points)}
                data={slot.read ? { player: slot.read.player.id } : undefined}
              />
            ))}
            <p className={`${u.sub} ${w.drawerBody}`}>Best lineup at per game rates. The gains above count byes and matchups week by week.</p>
          </Drawer>
        </>
      ) : null}

      {leagueView ? (
        <>
          {leagueView.line ? (
            <Card>
              <p className={u.bodyText}>{curl(leagueView.line)}</p>
            </Card>
          ) : null}
          <Section title="Best Available">
            {leagueView.picks.length ? (
              <List tap>
                {leagueView.picks.map((p) => (
                  <Pick
                    key={p.read.player.id}
                    read={p.read}
                    value={`+${fmt(p.meanGain)}`}
                    label="Avg gain"
                    stats={[
                      { value: `${p.startsFor} of ${rosters.length}`, label: 'Starts for' },
                      ...(p.best ? [{ value: `+${fmt(p.best.gain)}`, label: `Most to ${p.best.manager}` }] : []),
                      ...usageItems(p.usage, p.trend, p.read.player.position),
                    ]}
                    move={`Claim ${short(p.read.player.name, p.read.player.position)}.`}
                  />
                ))}
              </List>
            ) : (
              <Empty>Nobody on waivers improves any lineup{pos ? ` at ${pos}` : ''}.</Empty>
            )}
          </Section>
          <p className={`${u.sub} ${w.inset}`}>
            Avg gain is what he adds over {window}, averaged across all {rosters.length} teams, zeros included. Pick a team for its own list.
          </p>
        </>
      ) : null}

      <RosMethod
        ctx={ctx}
        extra={<p className={u.bodyText}>Usage is shown, not multiplied in: the model already reads recent snap and target share, so scaling it again would count the same evidence twice.</p>}
      />
    </>
  );
}
