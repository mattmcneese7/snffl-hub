import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { getStandings, league } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'League, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** League: the standings as one table, the playoff line drawn where the field is cut, odds from the app's model. */
export default async function V4League() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings, odds] = await Promise.all([getV4Data(mine), getStandings(), getPlayoffOdds().catch(() => [])]);
  const oddsOf = new Map(odds.map((o) => [o.rosterId, o]));
  const cut = league.playoffTeams;
  return (
    <Shell data={data} active="league">
      <SectionHead icon="league" word="league" week={data.week} mine={data.myRoster} />
      <div className={s.title}>
        <h2>Standings</h2>
        <Link href="/standings">Bracket</Link>
      </div>
      <div className={s.list}>
        <div className={s.stRow} style={{ paddingTop: 10, paddingBottom: 6 }}>
          <span className={s.stH}>#</span>
          <span />
          <span className={s.stH}>Team</span>
          <span className={s.stH} style={{ textAlign: 'right' }}>W-L</span>
          <span className={s.stH} style={{ textAlign: 'right' }}>Playoffs</span>
        </div>
        {standings.map((t) => {
          const o = oddsOf.get(t.rosterId);
          return (
            <div key={t.rosterId} className={`${s.stRow} ${t.seed === cut ? s.stCut : ''} ${t.rosterId === mine ? s.prowMine : ''}`}>
              <span className={s.stSeed}>{t.seed}</span>
              <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: t.colors?.primary }}>
                {t.avatarUrl ? <img src={t.avatarUrl} alt="" /> : null}
              </span>
              <span className={s.who}>
                <b>{t.teamName}</b>
                <small>
                  {firstNameOf(t.rosterId) ?? t.manager} &middot; {t.pointsFor.toFixed(2)} PF{t.streak ? ` · ${t.streak}` : ''}
                </small>
              </span>
              <span className={s.stRec}>
                {t.wins}-{t.losses}
                {t.ties ? `-${t.ties}` : ''}
              </span>
              <span className={s.stOdds}>{o ? `${Math.round(o.makePlayoffs > 1 ? o.makePlayoffs : o.makePlayoffs * 100)}%` : '–'}</span>
            </div>
          );
        })}
      </div>
      <p className={s.note} style={{ padding: '0 4px' }}>
        Top {cut} make the playoffs. Odds from the app&rsquo;s season simulation.
      </p>
    </Shell>
  );
}
