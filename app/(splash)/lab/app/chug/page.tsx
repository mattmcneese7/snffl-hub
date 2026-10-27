import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CHUG_RULES } from '@/config/league-rules';
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
import { Avatar, Drawer, List, Row, Section, ui } from '../ui';
import l from '../modules/layout.module.css';

export const metadata: Metadata = { title: { absolute: 'Chug Meter, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The Chug Meter: a beer for every week a team finished with the lowest
 * score, every team listed, most owed first. Then the latest chug on film,
 * the current Shart's citation, the Wall of Sharts, the archive and a link to
 * the rules, which live on the Rules page.
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
  // Everyone with a beer gets a row; the rest share one line.
  const owed = rows.filter((r) => r.count > 0);
  const dry = rows.filter((r) => r.count === 0);
  const film = latestChug(week);
  const archive = chugFilms(week).filter((f) => f.week !== film?.week);
  const lowOf = (wk: number) => extremes.lows.find((l) => l.week === wk) ?? null;
  const wall = [...extremes.lows].sort((a, b) => b.week - a.week);

  return (
    <Shell data={data} active="league">
      <SectionHead icon="beer" word="chug" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />

      <ChugNowCard board={board} week={week} title="This Week" link={false} film={false} />

      <Section title="Chug Meter">
        <List>
          {owed.map((r) => (
            <Row
              key={r.team.rosterId}
              lead={<Avatar src={r.team.avatarUrl} color={r.team.colors?.primary} />}
              title={r.team.teamName.trim()}
              strong={r.team.rosterId === mine}
              sub={`${managerOf(r.team.rosterId)}${r.weeks.length ? ` · ${r.weeks.map((w) => `W${w}`).join(', ')}` : ''}`}
              value={r.count}
              valueSub={r.count === 1 ? 'beer' : 'beers'}
            />
          ))}
          {dry.length ? <Row label="0 beers" title={dry.map((r) => managerOf(r.team.rosterId)).join(', ')} muted /> : null}
        </List>
        <p className={`${ui.sub} ${l.note}`}>
          {total} {total === 1 ? 'beer' : 'beers'} this season.
        </p>
      </Section>

      {film ? (
        <Section title="The Latest Chug">
          <figure className={`${ui.card} ${l.stack}`}>
            <span className={`${ui.media} ${l.tall}`}>
              <video src={`${film.src}#t=0.5`} controls playsInline preload="metadata" aria-label={`The week ${film.week} chug`} />
            </span>
            <figcaption className={`${ui.sub} ${l.note}`}>Week {film.week}</figcaption>
          </figure>
        </Section>
      ) : null}

      <ShartCitation onChug />

      {wall.length ? (
        <Section title="Wall of Sharts">
          <List>
            {wall.map((w) => (
              <Row key={w.week} label={`Week ${w.week}`} title={teamOf(w.rosterId)} strong={w.rosterId === mine} sub={managerOf(w.rosterId)} value={w.points.toFixed(2)} />
            ))}
          </List>
        </Section>
      ) : null}

      {archive.length ? (
        <Drawer title="The Archive" value={`${archive.length} ${archive.length === 1 ? 'film' : 'films'}`}>
          <div className={l.grid2}>
            {archive.map((f) => {
              const low = lowOf(f.week);
              return (
                <figure key={f.week} className={l.stack}>
                  <span className={`${ui.media} ${l.tall}`}>
                    <video src={`${f.src}#t=0.5`} controls playsInline preload="metadata" aria-label={`The week ${f.week} chug`} />
                  </span>
                  <figcaption className={ui.body}>
                    <span className={ui.title}>Week {f.week}</span>
                    {low ? <span className={ui.sub}>{teamOf(low.rosterId)}</span> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </Drawer>
      ) : null}

      <List tap>
        <Row href="/lab/app/rules" title={CHUG_RULES.title.replace(/\b\w/g, (x) => x.toUpperCase())} sub={CHUG_RULES.intro?.split('. ')[0]} />
      </List>
    </Shell>
  );
}
