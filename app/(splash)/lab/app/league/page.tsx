import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { getPowerRankings, getStandings, league } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { getTrophyBoard } from '@/lib/trophies';
import AwardIcon, { AWARD_NAME } from '../modules/AwardIcon';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'League, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const PAGES: [string, string][] = [
  ['Bracket', '/lab/app/league/bracket'],
  ['Feed', '/lab/app/feed'],
  ['Managers', '/lab/app/managers'],
  ['Trades', '/lab/app/trades'],
  ['Trophy Case', '/lab/app/trophies'],
  ['Chug Meter', '/lab/app/chug'],
  ['Insights', '/lab/app/insights'],
  ['Players', '/lab/app/players'],
  ['Rules', '/lab/app/rules'],
];

const avg = (t: { pointsFor: number; wins: number; losses: number; ties: number }) => {
  const g = t.wins + t.losses + t.ties;
  return g ? (t.pointsFor / g).toFixed(2) : '0.00';
};

/** League: the standings as one table, the playoff line drawn where the field is cut, odds from the app's model. */
export default async function V4League() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings, odds, power, board] = await Promise.all([
    getV4Data(mine),
    getStandings(),
    getPlayoffOdds().catch(() => []),
    getPowerRankings().catch(() => []),
    getTrophyBoard().catch(() => null),
  ]);
  const held = board?.holders ?? {};
  const oddsOf = new Map(odds.map((o) => [o.rosterId, o]));
  const cut = league.playoffTeams;
  return (
    <Shell data={data} active="league">
      <SectionHead icon="league" word="league" week={data.week} mine={data.myRoster} />
      <nav className={s.chips} aria-label="League pages">
        {PAGES.map(([label, href]) => (
          <Link key={href} href={href} className={s.chipA}>
            {label}
          </Link>
        ))}
      </nav>
      <div className={s.title}>
        <h2>Standings</h2>
        <Link href="/lab/app/league/bracket">Bracket</Link>
      </div>
      <div className={s.list}>
        <div className={s.stRow} style={{ paddingTop: 12, paddingBottom: 8 }}>
          <span className={s.stH}>#</span>
          <span />
          <span className={s.stH}>Team</span>
          <span className={s.stH} style={{ textAlign: 'right' }}>W-L</span>
          <span className={s.stH} style={{ textAlign: 'right' }}>Playoffs</span>
        </div>
        {standings.map((t) => {
          const o = oddsOf.get(t.rosterId);
          return (
            <Link href={`/lab/app/managers/${t.rosterId}`} key={t.rosterId} className={`${s.stRow} ${s.rowLink} ${t.seed === cut ? s.stCut : ''} ${t.rosterId === mine ? s.prowMine : ''}`}>
              <span className={s.stSeed}>{t.seed}</span>
              <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: t.colors?.primary }}>
                {t.avatarUrl ? <img src={t.avatarUrl} alt="" /> : null}
              </span>
              <span className={s.who}>
                <b className={s.heldName}>
                  {t.teamName}
                  {(held[t.rosterId] ?? []).map((k) => (
                    <span key={k} className={s.held} title={`Holds ${AWARD_NAME[k]}`}>
                      <AwardIcon kind={k} size={18} />
                      <span className={s.sr}>Holds {AWARD_NAME[k]}</span>
                    </span>
                  ))}
                </b>
                <small>
                  {firstNameOf(t.rosterId) ?? t.manager} &middot; {t.pointsFor.toFixed(2)} PF{t.streak ? ` · ${t.streak}` : ''}
                </small>
              </span>
              <span className={s.stRec}>
                {t.wins}-{t.losses}
                {t.ties ? `-${t.ties}` : ''}
              </span>
              <span className={s.stOdds}>{o ? `${Math.round(o.makePlayoffs > 1 ? o.makePlayoffs : o.makePlayoffs * 100)}%` : '–'}</span>
            </Link>
          );
        })}
      </div>
      <p className={s.note} style={{ padding: '0 14px' }}>
        Top {cut} make the playoffs. Odds from 10,000 simulated seasons.
      </p>
      {power.length ? (
        <>
          <div className={s.title}>
            <h2>Power Rankings</h2>
          </div>
          <div className={s.list}>
            {power.map((p) => (
              <Link href={`/lab/app/managers/${p.team.rosterId}`} key={p.team.rosterId} className={`${s.pwRow} ${s.rowLink} ${p.team.rosterId === mine ? s.prowMine : ''}`}>
                <span className={s.stSeed}>{p.rank}</span>
                <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: p.team.colors?.primary }}>
                  {p.team.avatarUrl ? <img src={p.team.avatarUrl} alt="" /> : null}
                </span>
                <span className={s.who}>
                  <b>{p.team.teamName}</b>
                  <small>
                    {firstNameOf(p.team.rosterId) ?? p.team.manager} &middot; {avg(p.team)} per game
                  </small>
                </span>
                <span className={`${s.pwMove} ${p.movement && p.movement > 0 ? s.win : p.movement && p.movement < 0 ? s.loss : ''}`}>
                  {p.movement == null ? 'New' : p.movement === 0 ? 'Even' : p.movement > 0 ? `Up ${p.movement}` : `Down ${-p.movement}`}
                </span>
              </Link>
            ))}
          </div>
          <p className={s.note} style={{ padding: '0 14px' }}>
            Ranked on win rate, average score and the last three weeks.
          </p>
        </>
      ) : null}
    </Shell>
  );
}
