import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { CHUG_RULES, CHUG_SUBMISSION } from '@/config/league-rules';
import { getChugCounts, getWeeklyExtremes } from '@/lib/awards';
import { latestChug } from '@/lib/chug-video';
import { chugFilms } from '../lib/chug-films';
import Fold from '../kit/Fold';
import { scoredWeek, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import { WidgetHead } from '../home/Widget';
import Icon from '../home/Icons';
import w from '../home/widgets.module.css';
import c from './chug.module.css';

export const metadata: Metadata = { title: { absolute: 'Chug Meter, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The Chug Meter: one beer for every week a manager finished with the
 * lowest score, for all 14, most owed first. v2 drew the beers as columns
 * of cartoon glasses; here each beer is the icon set's stein, laid in a row
 * beside the manager, so 14 names read flat on a phone instead of at an
 * angle. Then the rules, and the latest chug on film, which is our own file
 * and so plays right here.
 */
export default async function ChugPage() {
  const week = await scoredWeek();
  const [tallies, extremes, jar] = await Promise.all([
    getChugCounts(),
    getWeeklyExtremes().catch(() => ({ highs: [], lows: [] })),
    cookies(),
  ]);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const nameOf = (rosterId: number, fallback: string) => firstNameOf(rosterId) ?? fallback;

  // Every manager gets a row, including the ones who have never chugged.
  const rows = teams
    .map((team) => {
      const tally = tallies.find((t) => t.rosterId === team.rosterId);
      return {
        rosterId: team.rosterId,
        name: nameOf(team.rosterId, team.manager),
        teamName: team.teamName,
        avatar: team.avatarUrl,
        count: tally?.count ?? 0,
        weeks: tally?.weeks ?? [],
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const total = rows.reduce((n, r) => n + r.count, 0);

  const film = latestChug(week);
  // The archive: every film before the latest, folded away until opened.
  const archive = chugFilms(week).filter((f) => f.week !== film?.week);
  const lowOf = (wk: number) => {
    const low = extremes.lows.find((l) => l.week === wk);
    const team = low ? teams.find((t) => t.rosterId === low.rosterId) : undefined;
    return low && team ? { name: nameOf(low.rosterId, team.manager), points: low.points } : null;
  };
  const filmLow = film ? extremes.lows.find((l) => l.week === film.week) : undefined;
  const filmTeam = filmLow ? teams.find((t) => t.rosterId === filmLow.rosterId) : undefined;

  return (
    <Shell active="more">
      <PageHead title="Chug Meter" />
      <div className={w.grid}>
        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead
            icon="stein"
            title="Who owes"
            aside={
              <span className={w.sub}>
                {total} {total === 1 ? 'beer' : 'beers'}
              </span>
            }
          />
          {total === 0 ? <p className={w.empty}>No chugs yet</p> : null}
          <ol className={w.list}>
            {rows.map((r) => (
              <li key={r.rosterId} className={r.rosterId === mine ? w.mineRow : undefined}>
                <Link href={`/managers/${r.rosterId}`} className={c.row}>
                  <span className={c.face}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.avatar ? <img src={r.avatar} alt="" loading="lazy" /> : null}
                  </span>
                  <span className={c.who}>
                    <span className={c.name}>{r.name}</span>
                    <span className={c.team}>{r.teamName}</span>
                  </span>
                  <span className={c.count}>{r.count}</span>
                  {r.count ? (
                    <span className={c.steins}>
                      {Array.from({ length: r.count }, (_, i) => (
                        <Icon key={i} name="stein" className={c.stein} />
                      ))}
                      <span className={c.weeks}>{r.weeks.map((wk) => `W${wk}`).join(', ')}</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {film ? (
          <section className={`${w.widget} ${w.l}`}>
            <WidgetHead icon="play" title="The latest chug" aside={<span className={w.sub}>Week {film.week}</span>} />
            <div className={c.film}>
              <video
                src={`${film.src}#t=0.5`}
                controls
                playsInline
                preload="metadata"
                className={c.video}
                aria-label={`The week ${film.week} chug`}
              />
            </div>
            {filmLow && filmTeam ? (
              <p className={c.filmLine}>
                Shart | <b>{nameOf(filmLow.rosterId, filmTeam.manager)}</b>, {filmLow.points.toFixed(2)}
              </p>
            ) : null}
          </section>
        ) : null}

        {archive.length ? (
          <Fold
            className={`${w.widget} ${w.l} ${c.archive}`}
            headClassName={c.archiveHead}
            label="the archive"
            defaultOpen={false}
            head={
              <>
                <Icon name="play" className={w.headIcon} />
                <span className={w.title}>The archive</span>
                <span className={`${w.sub} ${c.archiveCount}`}>
                  {archive.length} {archive.length === 1 ? 'film' : 'films'}
                </span>
              </>
            }
          >
            <div className={c.archiveGrid}>
              {archive.map((f) => {
                const low = lowOf(f.week);
                return (
                  <figure key={f.week} className={c.archiveItem}>
                    <video src={`${f.src}#t=0.5`} controls playsInline preload="metadata" className={c.archiveVideo} aria-label={`The week ${f.week} chug`} />
                    <figcaption>
                      <b>Week {f.week}</b>
                      {low ? (
                        <span>
                          {low.name}, {low.points.toFixed(2)}
                        </span>
                      ) : null}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </Fold>
        ) : null}

        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="gavel" title={CHUG_RULES.title} />
          {CHUG_RULES.intro ? <p className={c.intro}>{CHUG_RULES.intro}</p> : null}
          <ol className={c.rules}>
            {CHUG_RULES.rules.map((rule, i) => (
              <li key={rule}>
                <span className={c.ruleNum}>{i + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
          <p className={c.submit}>
            <Icon name="megaphone" className={c.submitIcon} />
            <span>{CHUG_SUBMISSION}</span>
          </p>
        </section>
      </div>
    </Shell>
  );
}
