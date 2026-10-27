import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CHUG_RULES, CHUG_SUBMISSION } from '@/config/league-rules';
import { getChugCounts, getWeeklyExtremes } from '@/lib/awards';
import { latestChug } from '@/lib/chug-video';
import { scoredWeek, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { chugFilms } from '../../../lib/chug-films';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import ShartCitation from '../modules/ShartCitation';
import ChugNowCard from '../modules/ChugNow';
import { trophyBoard } from '../cached';
import { managerOf, teamOf } from '../modules/shared';
import m from '../modules/modules.module.css';
import s from '../v4.module.css';
import c from './chug.module.css';
import { Ms } from '../icons';

export const metadata: Metadata = { title: { absolute: 'Chug Meter, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The Chug Meter: a beer for every week a team finished with the lowest
 * score, every team listed, most owed first. Then the latest chug on film,
 * the current Shart's citation, the Wall of Sharts, the archive and the rules.
 */
export default async function V4Chug() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const week = await scoredWeek();
  const [data, tallies, extremes, board] = await Promise.all([getV4Data(mine), getChugCounts().catch(() => []), getWeeklyExtremes().catch(() => ({ highs: [], lows: [] })), trophyBoard().catch(() => null)]);

  const rows = teams
    .map((team) => {
      const tally = tallies.find((x) => x.rosterId === team.rosterId);
      return { team, count: tally?.count ?? 0, weeks: tally?.weeks ?? [] };
    })
    .sort((a, b) => b.count - a.count || a.team.teamName.localeCompare(b.team.teamName));
  const total = rows.reduce((n, r) => n + r.count, 0);
  const film = latestChug(week);
  const archive = chugFilms(week).filter((f) => f.week !== film?.week);
  const lowOf = (wk: number) => extremes.lows.find((l) => l.week === wk) ?? null;
  const filmLow = film ? lowOf(film.week) : null;
  const wall = [...extremes.lows].sort((a, b) => b.week - a.week);

  return (
    <Shell data={data} active="league">
      <SectionHead icon="beer" word="chug" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />

      <ChugNowCard board={board} week={week} title="This Week" link={false} />
      <div className={s.title}>
        <h2>Chug Meter</h2>
        <span className={s.wk}>
          {total} {total === 1 ? 'beer' : 'beers'}
        </span>
      </div>
      <div className={s.list}>
        {rows.map((r) => (
          <div key={r.team.rosterId} className={`${c.row} ${r.team.rosterId === mine ? m.mine : ''}`}>
            <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: r.team.colors?.primary }}>
              {r.team.avatarUrl ? <img src={r.team.avatarUrl} alt="" /> : null}
            </span>
            <span className={s.who}>
              <b>{r.team.teamName.trim()}</b>
              <small>
                {managerOf(r.team.rosterId)}
                {r.weeks.length ? ` · ${r.weeks.map((w) => `W${w}`).join(', ')}` : ''}
              </small>
              {r.count ? (
                <span className={m.steins} aria-hidden>
                  {Array.from({ length: r.count }, (_, i) => (
                    <Ms key={i} name="beer" />
                  ))}
                </span>
              ) : null}
            </span>
            <span className={`${m.big} ${r.count ? '' : c.zero}`}>{r.count}</span>
          </div>
        ))}
      </div>

      {film ? (
        <>
          <div className={s.title}>
            <h2>The Latest Chug</h2>
            <span className={s.wk}>Week {film.week}</span>
          </div>
          <figure className={c.film}>
            <video src={`${film.src}#t=0.5`} controls playsInline preload="metadata" aria-label={`The week ${film.week} chug`} />
            {filmLow ? (
              <figcaption>
                <b>{teamOf(filmLow.rosterId)}</b> &middot; {managerOf(filmLow.rosterId)} &middot; {filmLow.points.toFixed(2)} pts
              </figcaption>
            ) : null}
          </figure>
        </>
      ) : null}

      <ShartCitation />

      {wall.length ? (
        <>
          <div className={s.title}>
            <h2>Wall of Sharts</h2>
            <span className={s.wk}>Every week</span>
          </div>
          <div className={s.list}>
            {wall.map((l) => (
              <div key={l.week} className={`${c.wall} ${l.rosterId === mine ? m.mine : ''}`}>
                <span className={c.wk}>W{l.week}</span>
                <span className={s.who}>
                  <b>{teamOf(l.rosterId)}</b>
                  <small>{managerOf(l.rosterId)}</small>
                </span>
                <span className={`${m.big} ${c.low}`}>{l.points.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {archive.length ? (
        <details className={c.archive}>
          <summary>
            <span>The Archive</span>
            <span className={s.wk}>
              {archive.length} {archive.length === 1 ? 'film' : 'films'}
            </span>
          </summary>
          <div className={c.archiveGrid}>
            {archive.map((f) => {
              const low = lowOf(f.week);
              return (
                <figure key={f.week} className={c.archiveItem}>
                  <video src={`${f.src}#t=0.5`} controls playsInline preload="metadata" aria-label={`The week ${f.week} chug`} />
                  <figcaption>
                    <b>Week {f.week}</b>
                    {low ? <span>{teamOf(low.rosterId)}</span> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </details>
      ) : null}

      <div className={s.title}>
        <h2>{CHUG_RULES.title.replace(/\b\w/g, (x) => x.toUpperCase())}</h2>
      </div>
      <section className={s.card}>
        {CHUG_RULES.intro ? <p className={s.note}>{CHUG_RULES.intro}</p> : null}
        <ol className={s.numbered}>
          {CHUG_RULES.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <p className={c.submit}>{CHUG_SUBMISSION}</p>
      </section>
    </Shell>
  );
}
