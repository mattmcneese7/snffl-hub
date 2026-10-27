import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CHUG_SUBMISSION, CUSTOM_RULES } from '@/config/league-rules';
import { league } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { DEFENSE, KICKING, OFFENSE, perPoint, POINTS_ALLOWED, rowsOf, signed, YARDS_ALLOWED, type Row } from '../../../rules/scoring';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'Rules, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className={s.rules}>
      {rows.map((row) => {
        const every = row.key.endsWith('_yd') ? perPoint(row.value) : null;
        return (
          <li key={row.key}>
            <span>
              {row.label}
              {every ? <small>1 point per {every} yards</small> : null}
            </span>
            <b className={row.value < 0 ? s.rNeg : row.value === 0 ? s.rZero : undefined}>{signed(row.value)}</b>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The rules: setup and scoring read straight from Sleeper's settings, so
 * they match what Sleeper counts, then the league's own rules, the chug.
 */
export default async function V4Rules() {
  const jar = await cookies();
  const data = await getV4Data(parseTeam(jar.get(TEAM_COOKIE)?.value));
  const starters = league.rosterPositions.filter((p) => p !== 'BN' && p !== 'IR');
  const bench = league.rosterPositions.filter((p) => p === 'BN').length;
  const ir = league.rosterPositions.filter((p) => p === 'IR').length;
  const offense = rowsOf(OFFENSE);
  const kicking = rowsOf(KICKING);
  const defense = rowsOf(DEFENSE);
  const points = rowsOf(POINTS_ALLOWED);
  const yards = rowsOf(YARDS_ALLOWED);
  const setup: [string, string | number][] = [
    ['Teams', league.teamCount],
    ['Playoff teams', league.playoffTeams],
    ['Playoffs start', `Week ${league.playoffWeekStart}`],
    ['Bench', bench],
    ...(ir ? [['IR', ir] as [string, number]] : []),
  ];
  return (
    <Shell data={data} active="league">
      <SectionHead icon="league" word="rules" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />
      {CUSTOM_RULES.map((sec) => (
        <section key={sec.title} className={s.card}>
          <h3>{sec.title}</h3>
          {sec.intro ? <p className={s.note}>{sec.intro}</p> : null}
          <ol className={s.numbered}>
            {sec.rules.map((r) => (
              <li key={r}>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <p className={s.note}>{CHUG_SUBMISSION}</p>
        </section>
      ))}
      <div className={s.title}>
        <h2>League Setup</h2>
      </div>
      <section className={s.card}>
        <ul className={s.rules}>
          {setup.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </li>
          ))}
        </ul>
        <p className={s.subH}>Starting lineup</p>
        <div className={s.slots}>
          {starters.map((p, i) => (
            <i key={i} className={`${s.pos} ${s[`p${p}`] ?? ''}`}>
              {p === 'SUPER_FLEX' ? 'SF' : p}
            </i>
          ))}
        </div>
      </section>
      {offense.length ? (
        <>
          <div className={s.title}>
            <h2>Offense</h2>
          </div>
          <section className={s.card}>
            <Rows rows={offense} />
          </section>
        </>
      ) : null}
      {kicking.length ? (
        <>
          <div className={s.title}>
            <h2>Kicking</h2>
          </div>
          <section className={s.card}>
            <Rows rows={kicking} />
          </section>
        </>
      ) : null}
      {defense.length || points.length ? (
        <>
          <div className={s.title}>
            <h2>Defense</h2>
          </div>
          <section className={s.card}>
            {defense.length ? <Rows rows={defense} /> : null}
            {points.length ? (
              <>
                <p className={s.subH}>Points allowed</p>
                <Rows rows={points} />
              </>
            ) : null}
            {yards.some((y) => y.value !== 0) ? (
              <>
                <p className={s.subH}>Yards allowed</p>
                <Rows rows={yards} />
              </>
            ) : null}
          </section>
        </>
      ) : null}
      <p className={s.note} style={{ padding: '0 4px' }}>
        Setup and scoring come from Sleeper&rsquo;s league settings.
      </p>
    </Shell>
  );
}
