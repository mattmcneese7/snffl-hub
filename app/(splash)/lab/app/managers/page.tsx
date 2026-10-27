import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { TROPHIES } from '@/components/Trophy';
import { firstNameOf } from '@/config/managers';
import { getStandings } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrophyBoard } from '@/lib/trophies';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';
import p from '../players/p4.module.css';

export const metadata: Metadata = { title: { absolute: 'Managers, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

/**
 * Managers: every team in table order, the team name leading and the
 * manager under it, the record and points for, and the hardware each one
 * holds from the latest week. A row opens that manager's page.
 */
export default async function V4Managers() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings, board] = await Promise.all([getV4Data(mine), getStandings(), getTrophyBoard().catch(() => null)]);
  return (
    <Shell data={data} active="league">
      <div className={p.wrap}>
        <SectionHead icon="groups" word="managers" week={data.week} mine={data.myRoster} />
        {standings.length ? (
          <div className={s.list}>
            {standings.map((t) => {
              const held = board?.holders[t.rosterId] ?? [];
              return (
                <Link key={t.rosterId} href={`/lab/app/managers/${t.rosterId}`} className={`${p.row} ${t.rosterId === mine ? p.rowMine : ''}`} style={{ gridTemplateColumns: '22px auto minmax(0, 1fr) auto' }}>
                  <span className={p.seed}>{t.seed}</span>
                  <span className={s.av} style={{ width: 36, height: 36, ['--mgr' as string]: t.colors?.primary }}>
                    {t.avatarUrl ? <img src={t.avatarUrl} alt="" /> : null}
                  </span>
                  <span className={p.rowName}>
                    <b>{t.teamName.trim()}</b>
                    <small>
                      {firstNameOf(t.rosterId) ?? t.manager}
                      {t.rosterId === mine ? ' · You' : ''}
                    </small>
                    {held.length ? (
                      <span className={p.chips} style={{ marginTop: 3 }}>
                        {held.slice(0, 2).map((k) => (
                          <span key={k} className={`${p.chip} ${k === 'shart' || k === 'plunger' ? p.bad : p.gold}`}>
                            {TROPHIES[k].name}
                          </span>
                        ))}
                        {held.length > 2 ? <span className={`${p.chip} ${p.gold}`}>+{held.length - 2}</span> : null}
                      </span>
                    ) : null}
                  </span>
                  <span className={p.rowPts}>
                    <span className={p.rec}>{record(t)}</span>
                    <small>PF {t.pointsFor.toFixed(1)}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className={s.empty}>League unavailable from Sleeper.</p>
        )}
      </div>
    </Shell>
  );
}
