import type { ReactNode } from 'react';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { league, teams } from '@/lib/league';
import { parseTeam } from '@/lib/my-team';
import { windowLabel, type RosRead } from '@/lib/rest-of-season';
import { getLeague, type SleeperRoster } from '@/lib/sleeper';
import type { UsageEntry } from '@/lib/spine';
import { candidatePool, waiversForTeam, waiversLeagueWide } from '@/lib/waivers';
import { qv, swamiHref, type SwamiQuery } from '../../../swami/moves-query';
import { rosBoard } from '../cached';
import CopyMove from './CopyMove';
import { curl, Face, fmt, metaLine, Panel, Pos, RosMethod, RosWorking, short, Tag } from './parts';
import w from './swami.module.css';

/**
 * Waiver pickups. With a team (the URL's, else yours) it ranks every
 * unrostered player by what he adds to that team's best lineup, names the
 * starter he pushes out, and copies the claim.
 * With the league picked it is the league's board: who would start for the
 * most teams. Team and position live in the URL (team, wpos).
 */

const BASE = '/lab/app/swami';
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teams.find((t) => t.rosterId === rosterId)?.manager ?? `Team ${rosterId}`;

type FullRoster = SleeperRoster & { reserve?: string[] | null; taxi?: string[] | null };

function Usage({ usage, trend, position }: { usage: UsageEntry | null; trend: string | null; position: string }) {
  if (position === 'K' || position === 'DEF' || !usage) return null;
  const moved = usage.recent && trend && trend !== 'steady';
  return (
    <>
      <Tag label="Snaps" value={pct(usage.snapShare)} />
      {moved && usage.recent ? (
        <Tag
          label={`Last ${usage.recent.weeks} ${usage.recent.weeks === 1 ? 'game' : 'games'}`}
          value={`${pct(usage.recent.snapShare)}, ${trend}`}
          tone={trend === 'rising' ? 'good' : undefined}
        />
      ) : null}
    </>
  );
}

function Pick({ read, value, label, children, move }: { read: RosRead; value: string; label: string; children: ReactNode; move?: string }) {
  return (
    <details className={w.item}>
      <summary className={w.row}>
        <Face read={read} />
        <span className={w.who}>
          <b>{read.player.name}</b>
          <small>
            <Pos pos={read.player.position} /> {metaLine(read, true)}
          </small>
        </span>
        <span className={w.num}>
          <b>{value}</b>
          <small>{label}</small>
        </span>
      </summary>
      <div className={w.detail}>
        <div className={w.tags}>{children}</div>
        {move ? <CopyMove text={move} label="Copy claim" /> : null}
        <RosWorking read={read} />
        <Link href={`/lab/app/players/${read.player.id}`} className={w.go}>
          Player page
        </Link>
      </div>
    </details>
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

  const teamHref = (t: number | 'league') => swamiHref(query, { team: String(t) }, BASE);
  const posHref = (p: string | null) => swamiHref(query, { team: team ? String(team) : 'league', wpos: p }, BASE);
  const ordered = [...teams].sort((x, y) => Number(y.rosterId === mine) - Number(x.rosterId === mine));
  const window = windowLabel(ctx);

  return (
    <Panel icon="money" title="Waiver Pickups" aside={window.charAt(0).toUpperCase() + window.slice(1)}>
      <div className={w.group}>
        <p className={w.sub}>
          Pickups For <b>&middot; {teamView ? teamView.teamName : 'The Whole League'}</b>
        </p>
        <nav className={w.rail} aria-label="Team">
          <Link href={teamHref('league')} scroll={false} className={`${w.chip} ${!team ? w.chipOn : ''}`} aria-current={!team ? 'true' : undefined}>
            League
          </Link>
          {ordered.map((t) => {
            const on = t.rosterId === team;
            return (
              <Link key={t.rosterId} href={teamHref(t.rosterId)} scroll={false} className={`${w.chip} ${on ? w.chipOn : ''}`} aria-current={on ? 'true' : undefined}>
                {managerOf(t.rosterId)}
              </Link>
            );
          })}
        </nav>
        <nav className={w.rail} aria-label="Position">
          {[null, ...POSITIONS].map((p) => {
            const on = pos === p;
            return (
              <Link key={p ?? 'all'} href={posHref(p)} scroll={false} className={`${w.chip} ${on ? w.chipOn : ''}`} aria-current={on ? 'true' : undefined}>
                {p ?? 'All'}
              </Link>
            );
          })}
        </nav>
      </div>

      {teamView ? (
        <>
          {teamView.line ? (
            <div className={w.verdict}>
              <p>{curl(teamView.line)}</p>
            </div>
          ) : (
            <p className={w.note}>
              Nothing unrostered{pos ? ` at ${pos}` : ''} improves {teamView.teamName}&rsquo;s best lineup in any week from {ctx.from} to {ctx.through}.
            </p>
          )}
          {left != null ? (
            <div className={w.tags}>
              <Tag label="FAAB left" value={`$${left} of $${budget}`} />
              <Tag label="Roster" value={full ? 'Full, a drop is owed' : 'Open spot'} />
            </div>
          ) : null}
          {teamView.picks.length ? (
            <div className={w.group}>
              <p className={w.sub}>Best Adds &middot; Lineup Points Added</p>
              <div className={w.rows}>
                {teamView.picks.map((p) => (
                  <Pick
                    key={p.read.player.id}
                    read={p.read}
                    value={`+${fmt(p.rosGain)}`}
                    label="Lineup gain"
                    move={`Claim ${short(p.read.player.name, p.read.player.position)}.${
                      p.replaces ? ` Starts over ${short(p.replaces.read.player.name, p.replaces.read.player.position)} at ${p.replaces.slot}.` : ''
                    }${full ? ' Roster is full, so a drop is owed.' : ''}`}
                  >
                    <Tag label="Lineup gain" value={`+${fmt(p.rosGain)}`} tone="good" />
                    <Tag label="Per game" value={p.perGame > 0 ? `+${fmt(p.perGame)}` : 'Spot starts'} />
                    {p.replaces ? <Tag label="Replaces" value={`${short(p.replaces.read.player.name, p.replaces.read.player.position)}, ${p.replaces.slot}`} /> : null}
                    {p.thisWeek != null ? <Tag label="This week" value={p.thisWeek > 0 ? `+${fmt(p.thisWeek)}` : 'No help'} /> : null}
                    <Usage usage={p.usage} trend={p.trend} position={p.read.player.position} />
                  </Pick>
                ))}
              </div>
            </div>
          ) : null}
          <div className={w.group}>
            <p className={w.sub}>Measured Against &middot; A Typical Week</p>
            <div className={w.slots}>
              {teamView.lineup.map((slot, i) => (
                <div key={`${slot.slot}-${i}`} className={`${w.slot} ${slot.id && weakSlots.has(slot.id) ? w.slotWeak : ''}`}>
                  <span className={w.slotName}>{slot.slot === 'SUPER_FLEX' ? 'SF' : slot.slot}</span>
                  {slot.read ? (
                    <button type="button" data-player={slot.read.player.id} className={w.slotWho}>
                      {short(slot.read.player.name, slot.read.player.position)}
                    </button>
                  ) : (
                    <span className={w.slotWho}>Empty</span>
                  )}
                  <span className={w.slotPts}>{fmt(slot.points)}</span>
                </div>
              ))}
            </div>
            <p className={w.note}>Best lineup at per game rates. Marked slots are the ones the top pickups replace. The gains above count byes and matchups week by week.</p>
          </div>
        </>
      ) : null}

      {leagueView ? (
        <>
          {leagueView.line ? (
            <div className={w.verdict}>
              <p>{curl(leagueView.line)}</p>
            </div>
          ) : null}
          <div className={w.group}>
            <p className={w.sub}>Best Available &middot; Added to the Average Lineup</p>
            {leagueView.picks.length ? (
              <div className={w.rows}>
                {leagueView.picks.map((p) => (
                  <Pick key={p.read.player.id} read={p.read} value={`+${fmt(p.meanGain)}`} label="Average gain" move={`Claim ${short(p.read.player.name, p.read.player.position)}.`}>
                    <Tag label="Average gain" value={`+${fmt(p.meanGain)}`} tone="good" />
                    <Tag label="Starts for" value={`${p.startsFor} of ${rosters.length}`} />
                    {p.best ? <Tag label="Most to" value={`${p.best.manager}, +${fmt(p.best.gain)}`} /> : null}
                    <Usage usage={p.usage} trend={p.trend} position={p.read.player.position} />
                  </Pick>
                ))}
              </div>
            ) : (
              <p className={w.empty}>Nobody on the wire improves any lineup{pos ? ` at ${pos}` : ''}.</p>
            )}
            <p className={w.note}>
              The number is what he adds over {window}, averaged across all {rosters.length} teams, zeros included. Pick a team for its own list.
            </p>
          </div>
        </>
      ) : null}

      <RosMethod
        ctx={ctx}
        extra={<p>Usage is shown, not multiplied in: the model already reads recent snap and target share, so scaling it again would count the same evidence twice.</p>}
      />
    </Panel>
  );
}
