import type { ReactNode } from 'react';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { teams } from '@/lib/league';
import { parseTeam } from '@/lib/my-team';
import { windowLabel, type RosRead } from '@/lib/rest-of-season';
import type { UsageEntry } from '@/lib/spine';
import { candidatePool, waiversForTeam, waiversLeagueWide } from '@/lib/waivers';
import Fold from '../kit/Fold';
import k from '../kit/kit.module.css';
import Icon from '../home/Icons';
import w from '../home/widgets.module.css';
import { SleeperPill } from '../scoreboard/parts/shared';
import { Chip, curl, Face, fmt, metaLine, RosMethod, RosWorking } from './RosParts';
import { qv, rosBoard, swamiHref, type SwamiQuery } from './moves-query';
import s from './swami.module.css';
import m from './moves.module.css';

/**
 * Waiver pickups, v2's Swami view as a Splash widget. With a team (the URL's,
 * else yours from the team cookie) it ranks every unrostered player by what
 * he adds to that team's best lineup, names the starter he pushes out and
 * from which slot, and shows the lineup he is measured against. With the
 * league picked it is the league's board: who would start for the most teams.
 *
 * Team and position live in the URL (team, wpos), so a list is a link.
 */

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const pct = (n: number) => `${Math.round(n * 100)}%`;
const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teams.find((t) => t.rosterId === rosterId)?.manager ?? `Team ${rosterId}`;

/** Snap share, and the last few weeks beside it when they moved. Kickers and defenses have no role to read. */
function UsageChips({ usage, trend, position }: { usage: UsageEntry | null; trend: string | null; position: string }) {
  if (position === 'K' || position === 'DEF') return null;
  if (!usage) return null;
  const moved = usage.recent && trend && trend !== 'steady';
  return (
    <>
      <Chip label="Snap share" value={pct(usage.snapShare)} plain />
      {moved && usage.recent ? (
        <Chip
          label={`Last ${usage.recent.weeks} ${usage.recent.weeks === 1 ? 'game' : 'games'}`}
          value={`${pct(usage.recent.snapShare)}, ${trend}`}
          plain={trend !== 'rising'}
        />
      ) : null}
    </>
  );
}

/** One free agent: the research row, its number on the right, opening onto the why. */
function PickRow({ read, value, children, root = '' }: { read: RosRead; value: string; children: ReactNode; root?: string }) {
  return (
    <li>
      <details className={s.item}>
        <summary className={s.row}>
          <Face read={read} className={s.face} />
          <span className={s.who}>
            <span className={s.name}>{read.player.name}</span>
            <span className={s.meta}>{metaLine(read, true)}</span>
          </span>
          <span className={s.proj}>
            <span className={s.projNum}>{value}</span>
            <span className={s.chev} aria-hidden />
          </span>
        </summary>
        <div className={s.detail}>
          <span className={s.tags}>{children}</span>
          <RosWorking read={read} />
          <Link href={`${root}/players/${read.player.id}`} className={s.go}>
            Player page
          </Link>
        </div>
      </details>
    </li>
  );
}

export default async function Waivers({ query, mine, base = '/swami' }: { query: SwamiQuery; mine: number | null; base?: string }) {
  const { ctx, rosters, readOf, unrostered } = await rosBoard();

  // A team in the URL wins, so a pasted link shows what its sender saw. With
  // none, the device's own team, and with no team picked, the league.
  const raw = qv(query, 'team');
  const team: number | null = raw === 'league' ? null : (parseTeam(raw) ?? mine ?? null);
  const posRaw = qv(query, 'wpos');
  const pos = posRaw && POSITIONS.includes(posRaw) ? posRaw : null;

  const pool = candidatePool(
    unrostered.map((p) => readOf(p.id)),
    pos
  );
  const readsFor = (rosterId: number) => (rosters.find((r) => r.roster_id === rosterId)?.players ?? []).map(readOf);

  const teamView = team ? waiversForTeam({ rosterId: team, roster: readsFor(team), pool, ctx }) : null;
  const leagueView = team
    ? null
    : waiversLeagueWide({
        rosters: rosters.map((r) => ({ rosterId: r.roster_id, reads: (r.players ?? []).map(readOf) })),
        pool,
        ctx,
      });

  const weakSlots = new Set((teamView?.picks ?? []).slice(0, 3).flatMap((p) => (p.replaces ? [p.replaces.read.player.id] : [])));

  // Inside the 4.0 lab, player links stay in the lab.
  const root = base.startsWith('/lab/app') ? '/lab/app' : '';
  const teamHref = (t: number | 'league') => swamiHref(query, { team: String(t) }, base);
  const posHref = (p: string | null) => swamiHref(query, { team: team ? String(team) : 'league', wpos: p }, base);
  const ordered = [...teams].sort((x, y) => Number(y.rosterId === mine) - Number(x.rosterId === mine));
  const window = windowLabel(ctx);
  const Window = window.charAt(0).toUpperCase() + window.slice(1);

  return (
    <Fold
      className={`${w.widget} ${w.m} ${m.fold}`}
      headClassName={m.foldHead}
      label="the waiver pickups"
      head={
        <>
          <Icon name="coins" className={w.headIcon} />
          <span className={w.title}>Waiver pickups</span>
          <span className={`${w.sub} ${m.foldAside}`}>{Window}</span>
        </>
      }
    >
      <div className={m.body}>
        <div className={m.group}>
          <span className={m.label}>
            Pickups for | <b>{teamView ? teamView.teamName : 'The whole league'}</b>
          </span>
          <nav className={m.rail} aria-label="Team">
            <Link href={teamHref('league')} scroll={false} className={`${k.week} ${!team ? k.weekOn : ''}`} aria-current={!team ? 'true' : undefined}>
              League
            </Link>
            {ordered.map((t) => {
              const on = t.rosterId === team;
              return (
                <Link
                  key={t.rosterId}
                  href={teamHref(t.rosterId)}
                  scroll={false}
                  className={`${k.week} ${on ? k.weekOn : ''}`}
                  aria-current={on ? 'true' : undefined}
                >
                  {managerOf(t.rosterId)}
                </Link>
              );
            })}
          </nav>
          <nav className={m.rail} aria-label="Waiver position">
            {[null, ...POSITIONS].map((p) => {
              const on = pos === p;
              return (
                <Link key={p ?? 'all'} href={posHref(p)} scroll={false} className={`${k.week} ${on ? k.weekOn : ''}`} aria-current={on ? 'true' : undefined}>
                  {p ?? 'All'}
                </Link>
              );
            })}
          </nav>
        </div>

        {teamView ? (
          <>
            {teamView.line ? (
              <div className={m.verdict}>
                <p>{curl(teamView.line)}</p>
              </div>
            ) : (
              <p className={s.caveat}>
                Nothing unrostered{pos ? ` at ${pos}` : ''} improves {teamView.manager}&rsquo;s best lineup in any week from{' '}
                {ctx.from} to {ctx.through}.
              </p>
            )}

            {teamView.picks.length ? (
              <div className={m.group}>
                <span className={m.label}>
                  Best adds for {teamView.manager} | <b>lineup points added</b>
                </span>
                <ul className={w.list}>
                  {teamView.picks.map((p) => (
                    <PickRow key={p.read.player.id} read={p.read} value={`+${fmt(p.rosGain)}`} root={root}>
                      <Chip label="Lineup gain" value={`+${fmt(p.rosGain)}`} />
                      <Chip label="Per game" value={p.perGame > 0 ? `+${fmt(p.perGame)}` : 'Spot starts'} plain />
                      {p.replaces ? (
                        <Chip label="Replaces" value={`${p.replaces.read.player.name} at ${p.replaces.slot}`} plain />
                      ) : null}
                      {p.thisWeek != null ? (
                        <Chip label="This week" value={p.thisWeek > 0 ? `+${fmt(p.thisWeek)}` : 'No help'} plain />
                      ) : null}
                      <UsageChips usage={p.usage} trend={p.trend} position={p.read.player.position} />
                    </PickRow>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={m.group}>
              <span className={m.label}>
                Measured against | <b>{teamView.manager}&rsquo;s typical week</b>
              </span>
              <ul className={m.slots}>
                {teamView.lineup.map((slot, i) => (
                  <li key={`${slot.slot}-${i}`} className={`${m.slot} ${slot.id && weakSlots.has(slot.id) ? m.slotWeak : ''}`}>
                    <span className={m.slotName}>{slot.slot}</span>
                    {slot.read ? (
                      <Link href={`${root}/players/${slot.read.player.id}`} className={m.slotWho}>
                        {slot.read.player.name}
                      </Link>
                    ) : (
                      <span className={m.slotWho}>Empty</span>
                    )}
                    <span className={m.slotPts}>{fmt(slot.points)}</span>
                  </li>
                ))}
              </ul>
              <p className={s.note}>
                Best lineup at per game rates, byes and matchups aside. Washed slots are the ones the top pickups replace.
                The gains above do count byes and matchups, week by week.
              </p>
            </div>
          </>
        ) : null}

        {leagueView ? (
          <>
            {leagueView.line ? (
              <div className={m.verdict}>
                <p>{curl(leagueView.line)}</p>
              </div>
            ) : null}
            <div className={m.group}>
              <span className={m.label}>
                Best available | <b>added to the average lineup</b>
              </span>
              {leagueView.picks.length ? (
                <ul className={w.list}>
                  {leagueView.picks.map((p) => (
                    <PickRow key={p.read.player.id} read={p.read} value={`+${fmt(p.meanGain)}`} root={root}>
                      <Chip label="Average gain" value={`+${fmt(p.meanGain)}`} />
                      <Chip label="Starts for" value={`${p.startsFor} of ${rosters.length}`} plain />
                      {p.best ? <Chip label="Most to" value={`${p.best.manager}, +${fmt(p.best.gain)}`} plain /> : null}
                      <UsageChips usage={p.usage} trend={p.trend} position={p.read.player.position} />
                    </PickRow>
                  ))}
                </ul>
              ) : (
                <p className={w.empty}>Nobody on the wire improves any lineup{pos ? ` at ${pos}` : ''}.</p>
              )}
              <p className={s.note}>
                The number is what he adds to a lineup over {window}, averaged across all {rosters.length} teams, zeros
                included. Starts for counts the teams whose best lineup he&rsquo;d crack in a typical week. Pick a team for
                its own list.
              </p>
            </div>
          </>
        ) : null}

        <RosMethod
          ctx={ctx}
          extra={
            <p>
              Usage is shown, not multiplied in: the model already reads recent snap and target share, so scaling it again
              by a trend would count the same evidence twice. A trend shows when the last three weeks moved ten points or
              more against his season.
            </p>
          }
        />
        <div className={m.foot}>
          <SleeperPill action="players" label="Claim on waivers" />
        </div>
      </div>
    </Fold>
  );
}
