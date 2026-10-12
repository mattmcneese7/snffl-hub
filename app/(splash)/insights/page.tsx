import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { playerOf, teamByRoster } from '@/lib/league';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import { nflTeamName } from '../kit/nflTeams';
import Widget, { WidgetHead } from '../home/Widget';
import { getInsights } from '../lib/deep/load';
import type { DraftValueRow, UsageMove } from '../lib/deep/insights';
import w from '../home/widgets.module.css';
import s from './insights.module.css';

export const metadata: Metadata = { title: { absolute: 'Insights, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n < 0 ? `−${Math.abs(n).toFixed(2)}` : '0.00');
const record = (wins: number, losses: number, ties: number) => `${wins}-${losses}${ties ? `-${ties}` : ''}`;
const managerName = (rosterId: number) => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? null;
const weekSpan = (weeks: number[]) =>
  weeks.length === 1 ? `week ${weeks[0]}` : `weeks ${weeks[0]} to ${weeks[weeks.length - 1]}`;

function ManagerLink({ rosterId }: { rosterId: number }) {
  const name = managerName(rosterId);
  return name ? <Link href={`/managers/${rosterId}`}>{name}</Link> : null;
}

/** His face, his full name to his page, one meta line, a number on the right. */
function PlayerRow({ playerId, meta, children, value, small }: { playerId: string; meta?: ReactNode; children?: ReactNode; value?: string; small?: string }) {
  const player = playerOf(playerId);
  return (
    <li className={s.row}>
      <span className={s.face}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={player.headshot} alt="" loading="lazy" />
      </span>
      <span className={s.text}>
        <Link href={`/players/${playerId}`} className={s.name}>
          {player.name}
        </Link>
        {meta ? <span className={s.meta}>{meta}</span> : null}
        {children}
      </span>
      {value ? (
        <span className={s.value}>
          <span className={s.big}>{value}</span>
          {small ? <span className={s.small}>{small}</span> : null}
        </span>
      ) : (
        <span />
      )}
    </li>
  );
}

function DraftRows({ rows }: { rows: DraftValueRow[] }) {
  return (
    <ul className={w.list}>
      {rows.map((r) => (
        <PlayerRow
          key={r.playerId}
          playerId={r.playerId}
          meta={
            <>
              Round {r.round}, pick {r.pickNo} by <ManagerLink rosterId={r.rosterId} />
            </>
          }
          value={`${r.position}${r.seasonRank}`}
          small={`Drafted ${r.position}${r.draftedRank}`}
        />
      ))}
    </ul>
  );
}

function UsageRows({ rows }: { rows: UsageMove[] }) {
  return (
    <ul className={w.list}>
      {rows.map((r) => (
        <PlayerRow
          key={r.playerId}
          playerId={r.playerId}
          meta={
            <>
              {r.position}, <ManagerLink rosterId={r.rosterId} />
            </>
          }
        >
          <span className={s.chips}>
            <span className={w.chip}>
              Snaps | {pct(r.snapBefore)} to {pct(r.snapNow)}
            </span>
            {r.targetNow || r.targetBefore ? (
              <span className={w.chip}>
                Target share | {pct(r.targetBefore)} to {pct(r.targetNow)}
              </span>
            ) : null}
          </span>
        </PlayerRow>
      ))}
    </ul>
  );
}

/**
 * Insights: what the league's own data says once it is added up. Draft
 * value, what pickups have been worth, whose role is moving, who the rest of
 * Sleeper is adding that nobody here has, and who has been lucky. Every
 * number is computed from Sleeper and nflverse on the page's own request or
 * the nightly file; a widget with nothing to support it says so.
 */
export default async function InsightsPage() {
  const data = await getInsights();
  const { throughWeek, draft, pickups, usage, trending } = data;
  const luckRows = data.luck;
  const bidding = pickups.some((p) => p.faabSpent != null);

  return (
    <Shell active="more">
      <PageHead title="Insights" collapse />
      <div className={w.grid}>
        {/* Draft value: rank at his position now against where he went. */}
        <Widget size="m" icon="clipboard" title="Draft value">
          {draft.steals.length || draft.busts.length ? (
            <>
              {draft.steals.length ? (
                <div className={s.section}>
                  <span className={w.subHead}>Steals</span>
                  <DraftRows rows={draft.steals} />
                </div>
              ) : null}
              {draft.busts.length ? (
                <div className={s.section}>
                  <span className={w.subHead}>Busts, rounds 1 to 5</span>
                  <DraftRows rows={draft.busts} />
                </div>
              ) : null}
              <p className={w.via}>Position rank by season points through week {throughWeek}, league scoring | Sleeper</p>
            </>
          ) : (
            <p className={w.empty}>No finished weeks to rank the draft against yet.</p>
          )}
        </Widget>

        {/* Usage: share of snaps and targets, recent weeks against earlier. */}
        <Widget size="m" icon="gauge" title="Usage">
          {usage && (usage.risers.length || usage.fallers.length) ? (
            <>
              {usage.risers.length ? (
                <div className={s.section}>
                  <span className={w.subHead}>Rising</span>
                  <UsageRows rows={usage.risers} />
                </div>
              ) : null}
              {usage.fallers.length ? (
                <div className={s.section}>
                  <span className={w.subHead}>Falling</span>
                  <UsageRows rows={usage.fallers} />
                </div>
              ) : null}
              <p className={w.via}>
                Rostered players, {weekSpan(usage.priorWeeks)} against {weekSpan(usage.recentWeeks)} | nflverse
              </p>
            </>
          ) : (
            <p className={w.empty}>No rostered player&rsquo;s role has moved enough to call yet.</p>
          )}
        </Widget>

        {/* Pickups: what each manager's adds have scored in his lineup. */}
        <Widget size="m">
          <WidgetHead icon="pickup" title="Pickups" />
          {pickups.length ? (
            <>
              <div className={s.colHead}>
                <span className={w.subHead}>Team</span>
                <span className={w.subHead}>Started points</span>
              </div>
              <ul className={w.list}>
                {pickups.map((p) => {
                  const team = teamByRoster(p.rosterId);
                  const best = p.best ? playerOf(p.best.playerId) : null;
                  return (
                    <li key={p.rosterId} className={s.teamRow}>
                      <span className={s.text}>
                        <Link href={`/managers/${p.rosterId}`} className={s.name}>
                          {team?.teamName.trim() ?? `Roster ${p.rosterId}`}
                        </Link>
                        <span className={s.meta}>
                          {[
                            managerName(p.rosterId),
                            `${p.adds} ${p.adds === 1 ? 'add' : 'adds'}`,
                            bidding && p.faabSpent != null ? `$${p.faabSpent} FAAB` : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                          {best && p.best ? (
                            <>
                              {' | Best '}
                              <Link href={`/players/${best.id}`}>{best.name}</Link> {p.best.points.toFixed(2)}
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className={s.big}>{p.startedPoints.toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className={w.via}>Waiver claims and free agent adds, started from the week added, through week {throughWeek} | Sleeper</p>
            </>
          ) : (
            <p className={w.empty}>No waiver claims or free agent adds yet.</p>
          )}
        </Widget>

        {/* Trending: Sleeper's most added players that nobody here has. */}
        <Widget size="m">
          <WidgetHead icon="trending" title="Trending free agents" />
          {trending.length ? (
            <>
              <div className={s.colHead}>
                <span className={w.subHead}>Player</span>
                <span className={w.subHead}>Adds</span>
              </div>
              <ul className={w.list}>
                {trending.map((t) => {
                  const player = playerOf(t.playerId);
                  return (
                    <PlayerRow
                      key={t.playerId}
                      playerId={t.playerId}
                      meta={[player.position, player.position === 'DEF' ? null : nflTeamName(player.team)].filter(Boolean).join(', ')}
                      value={t.count.toLocaleString('en-US')}
                    />
                  );
                })}
              </ul>
              <p className={w.via}>Adds across every Sleeper league, last 24 hours | Sleeper</p>
            </>
          ) : (
            <p className={w.empty}>Nobody Sleeper is chasing is a free agent here.</p>
          )}
        </Widget>

        {/* Luck: the record against the all-play record. */}
        <Widget size="m" icon="dog" title="Luck">
          {luckRows.length ? (
            <>
              <ul className={s.table}>
                <li className={s.tHead}>
                  <span className={w.subHead}>Team</span>
                  <span className={`${w.subHead} ${s.right}`}>Record</span>
                  <span className={`${w.subHead} ${s.right}`}>All-play</span>
                  <span className={`${w.subHead} ${s.right}`}>Luck</span>
                </li>
                {luckRows.map((r) => {
                  const team = teamByRoster(r.rosterId);
                  return (
                    <li key={r.rosterId} style={{ display: 'contents' }}>
                      <Link href={`/managers/${r.rosterId}`} className={s.tRow}>
                        <span className={s.tTeam}>
                          <b>{team?.teamName.trim() ?? `Roster ${r.rosterId}`}</b>
                          {managerName(r.rosterId) ? <span>{managerName(r.rosterId)}</span> : null}
                        </span>
                        <span className={s.cell}>{record(r.wins, r.losses, r.ties)}</span>
                        <span className={s.cell}>{record(r.allPlayWins, r.allPlayLosses, r.allPlayTies)}</span>
                        <span className={s.luck}>{signed(r.luck)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className={w.via}>
                Wins less the wins each week&rsquo;s score earns against all {luckRows.length - 1} others, {weekSpan(Array.from({ length: throughWeek }, (_, i) => i + 1))} | Sleeper
              </p>
            </>
          ) : (
            <p className={w.empty}>Two finished weeks before luck means anything.</p>
          )}
        </Widget>
      </div>
    </Shell>
  );
}
