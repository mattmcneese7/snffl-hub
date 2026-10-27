import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { playerOf, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getInsights } from '../../../lib/deep/load';
import type { DraftValueRow, UsageMove } from '../../../lib/deep/insights';
import { getV4Data } from '../data';
import Shell from '../Shell';
import XHead from '../modules/Head';
import { managerOf, shortName, teamOf } from '../modules/shared';
import m from '../modules/modules.module.css';
import s from '../v4.module.css';
import i from './insights.module.css';

export const metadata: Metadata = { title: { absolute: 'Insights, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n < 0 ? `−${Math.abs(n).toFixed(2)}` : '0.00');
const record = (w: number, l: number, t: number) => `${w}-${l}${t ? `-${t}` : ''}`;
const weekSpan = (weeks: number[]) => (weeks.length === 1 ? `week ${weeks[0]}` : `weeks ${weeks[0]} to ${weeks[weeks.length - 1]}`);

/** A player row that opens the sheet: face, K. Cousins, a meta line, a number on the right. */
function PlayerRow({ id, meta, children, value, small, mine }: { id: string; meta?: ReactNode; children?: ReactNode; value?: string; small?: string; mine?: boolean }) {
  const p = playerOf(id);
  return (
    <button type="button" data-player={id} className={`${s.prow} ${mine ? s.prowMine : ''}`} aria-label={`${p.name}, open player`}>
      <span className={m.shot}>
        <img src={p.headshot} alt="" loading="lazy" />
      </span>
      <span className={s.prowName}>
        <b>{shortName(p.name, p.position, p.team)}</b>
        {meta ? <small>{meta}</small> : null}
        {children}
      </span>
      <span className={s.prowPts}>
        {value ? <b>{value}</b> : null}
        {small ? <small>{small}</small> : null}
      </span>
    </button>
  );
}

function Head({ title, note }: { title: string; note?: string }) {
  return (
    <div className={s.title}>
      <h2>{title}</h2>
      {note ? <span className={s.wk}>{note}</span> : null}
    </div>
  );
}

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
      <PlayerRow key={r.playerId} id={r.playerId} mine={r.rosterId === mine} meta={`${r.position} · ${teamOf(r.rosterId)}`}>
        <span className={i.chips}>
          <i className={`${m.mk} ${m.mkQuiet}`}>
            SNAPS {pct(r.snapBefore)} TO {pct(r.snapNow)}
          </i>
          {r.targetNow || r.targetBefore ? (
            <i className={`${m.mk} ${m.mkQuiet}`}>
              TGT SHARE {pct(r.targetBefore)} TO {pct(r.targetNow)}
            </i>
          ) : null}
        </span>
      </PlayerRow>
    ));

  return (
    <Shell data={data} active="league">
      <XHead icon="insights" word="insights" week={data.week} mine={data.myRoster} />

      <Head title="Draft Value" note={`Through week ${throughWeek}`} />
      {draft.steals.length || draft.busts.length ? (
        <div className={s.list}>
          {draft.steals.length ? <h3 className={i.sub}>Steals</h3> : null}
          {draftRows(draft.steals)}
          {draft.busts.length ? <h3 className={i.sub}>Busts, Rounds 1 to 5</h3> : null}
          {draftRows(draft.busts)}
          <div className={m.via}>Position rank by season points, league scoring &middot; Sleeper</div>
        </div>
      ) : (
        <p className={s.empty}>No finished weeks to rank the draft against yet.</p>
      )}

      <Head title="Usage" note="Snaps and targets" />
      {usage && (usage.risers.length || usage.fallers.length) ? (
        <div className={s.list}>
          {usage.risers.length ? <h3 className={i.sub}>Rising</h3> : null}
          {usageRows(usage.risers)}
          {usage.fallers.length ? <h3 className={i.sub}>Falling</h3> : null}
          {usageRows(usage.fallers)}
          <div className={m.via}>
            Rostered players, {weekSpan(usage.priorWeeks)} against {weekSpan(usage.recentWeeks)} &middot; nflverse
          </div>
        </div>
      ) : (
        <p className={s.empty}>No rostered player&rsquo;s role has moved enough to call yet.</p>
      )}

      <Head title="Pickups" note="Started points" />
      {pickups.length ? (
        <div className={s.list}>
          {pickups.map((p) => {
            const team = teamByRoster(p.rosterId);
            const best = p.best ? playerOf(p.best.playerId) : null;
            return (
              <div key={p.rosterId} className={`${i.team} ${p.rosterId === mine ? m.mine : ''}`}>
                <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: team?.colors?.primary }}>
                  {team?.avatarUrl ? <img src={team.avatarUrl} alt="" /> : null}
                </span>
                <span className={s.who}>
                  <b>{teamOf(p.rosterId)}</b>
                  <small>
                    {[managerOf(p.rosterId), `${p.adds} ${p.adds === 1 ? 'add' : 'adds'}`, bidding && p.faabSpent != null ? `$${p.faabSpent} FAAB` : null].filter(Boolean).join(' · ')}
                  </small>
                  {best && p.best ? (
                    <button type="button" data-player={best.id} className={`${m.pBtn} ${i.best}`}>
                      Best: {shortName(best.name, best.position, best.team)} {p.best.points.toFixed(2)}
                    </button>
                  ) : null}
                </span>
                <span className={m.big}>{p.startedPoints.toFixed(2)}</span>
              </div>
            );
          })}
          <div className={m.via}>Waiver claims and free agent adds, started from the week added, through week {throughWeek} &middot; Sleeper</div>
        </div>
      ) : (
        <p className={s.empty}>No waiver claims or free agent adds yet.</p>
      )}

      <Head title="Trending Free Agents" note="Last 24 hours" />
      {trending.length ? (
        <div className={s.list}>
          {trending.map((t) => {
            const p = playerOf(t.playerId);
            return <PlayerRow key={t.playerId} id={t.playerId} meta={[p.position, p.position === 'DEF' ? null : p.team].filter(Boolean).join(' · ')} value={t.count.toLocaleString('en-US')} small="Adds" />;
          })}
          <div className={m.via}>Adds across every Sleeper league, players nobody here rosters &middot; Sleeper</div>
        </div>
      ) : (
        <p className={s.empty}>Nobody Sleeper is chasing is a free agent here.</p>
      )}

      <Head title="Luck" note="Record against all-play" />
      {luck.length ? (
        <div className={s.list}>
          <div className={i.luckHead}>
            <span>Team</span>
            <span>Record</span>
            <span>All-play</span>
            <span>Luck</span>
          </div>
          {luck.map((r) => (
            <div key={r.rosterId} className={`${i.luck} ${r.rosterId === mine ? m.mine : ''}`}>
              <span className={s.who}>
                <b>{teamOf(r.rosterId)}</b>
                <small>{managerOf(r.rosterId)}</small>
              </span>
              <span>{record(r.wins, r.losses, r.ties)}</span>
              <span>{record(r.allPlayWins, r.allPlayLosses, r.allPlayTies)}</span>
              <b className={r.luck > 0 ? s.win : r.luck < 0 ? s.loss : undefined}>{signed(r.luck)}</b>
            </div>
          ))}
          <div className={m.via}>Wins less the wins each week&rsquo;s score earns against all {luck.length - 1} others &middot; Sleeper</div>
        </div>
      ) : (
        <p className={s.empty}>Two finished weeks before luck means anything.</p>
      )}
    </Shell>
  );
}
