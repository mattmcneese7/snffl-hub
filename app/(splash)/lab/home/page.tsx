import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { firstNameOf } from '@/config/managers';
import { getStandings, getWeekGames, scoredWeek, league } from '@/lib/league';
import { getMatchupContext } from '@/lib/matchup-live';
import { getPlayoffOdds } from '@/lib/playoff-odds';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { weekStory } from '@/lib/week-story';
import { Suspense } from 'react';
import LabShell from '../kit/LabShell';
import { Skeleton, SkeletonCard } from '../kit/Skeleton';
import { buildLabLive } from '../kit/liveFeed';
import Icon from '../../home/Icons';
import w from '../../home/widgets.module.css';
import Now, { type Upcoming } from './Now';
import StoryRings, { type Ring } from './StoryRings';
import h from './home.module.css';

export const metadata: Metadata = { title: { absolute: 'Home, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const CT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', hour: 'numeric', minute: '2-digit' });
const windowName = (iso: string) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long' }).format(d);
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(d));
  if (day === 'Monday') return 'Monday Night Football';
  if (day === 'Thursday') return 'Thursday Night Football';
  if (day === 'Sunday' && hour >= 19) return 'Sunday Night Football';
  if (day === 'Sunday') return hour < 14 ? 'The Sunday early games' : 'The Sunday afternoon games';
  return `${day}'s games`;
};

/** The rings stream in: building a week's story takes a few fetches. */
async function Rings({ week }: { week: number }) {
  // Story rings: the last three finished weeks, each with its cover.
  const done = [week - 1, week - 2, week - 3].filter((x) => x >= 1);
  const stories = await Promise.all(done.map((x) => weekStory(x).catch(() => [])));
  const rings: Ring[] = done
    .map((x, i) => {
      const s = stories[i];
      if (!s.length) return null;
      const intro = s.find((z) => z.kind === 'intro');
      const motw = s.find((z) => z.kind === 'motw');
      const cover = (motw && motw.kind === 'motw' ? motw.star?.headshot : null) ?? (intro && intro.kind === 'intro' ? intro.art.still : null) ?? null;
      return { week: x, cover, label: `Week ${x}` };
    })
    .filter((r): r is Ring => r != null);

  return <StoryRings rings={rings} />;
}

function RingsSkeleton() {
  return (
    <div className={h.rings} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={h.ring}>
          <Skeleton w={64} h={64} r={32} />
          <Skeleton w={44} h={12} />
        </span>
      ))}
    </div>
  );
}

/** The playoff picture: the top of the table, the line, and the odds. */
async function Picture() {
  const [standings, odds] = await Promise.all([getStandings(), getPlayoffOdds().catch(() => [])]);
  const lineAt = league.playoffTeams;
  const picture = standings.slice(0, lineAt + 2).map((s) => ({ ...s, odds: odds.find((o) => o.rosterId === s.rosterId) }));

  return (
    <section className={`${w.widget} ${w.l}`}>
      <div className={w.head}>
        <Icon name="trophy" className={w.headIcon} />
        <span className={w.title}>Playoff picture</span>
        <Link href="/lab/race" className={w.more}>
          Pick the rest
          <CaretRight weight="bold" className={w.caret} aria-hidden />
        </Link>
      </div>
      <ol className={h.picture}>
        {picture.map((s) => (
          <li key={s.rosterId} className={s.seed === lineAt + 1 ? h.below : ''}>
            <span className={h.seed}>{s.seed}</span>
            <span className={h.who}>
              <b>{firstNameOf(s.rosterId) ?? s.manager}</b>
              <span>
                {s.wins}-{s.losses}
                {s.ties ? `-${s.ties}` : ''}, {s.pointsFor.toFixed(2)} points
              </span>
            </span>
            {s.odds ? (
              <span className={h.odds}>
                <span className={h.oddsTrack} aria-hidden>
                  <span className={h.oddsFill} style={{ width: `${Math.max(2, s.odds.makePlayoffs)}%` }} />
                </span>
                <b>{Math.round(s.odds.makePlayoffs)}%</b>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Home, v4: the same jobs as 3.0's Home, rebuilt from the lab's pieces.
 * Stories along the top, then Now (what is on, your game rolling live, what
 * it takes), the rest of the league as a rail of live score cards that grow
 * into their gamecasts, the playoff picture with real odds, and your rival.
 */
export default async function LabHome() {
  const week = await scoredWeek();
  const [raw, ctx, jar] = await Promise.all([getWeekGames(week), getMatchupContext(week), cookies()]);
  const live = buildLabLive(week, raw, ctx);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);

  // What is on next: the next kickoff window, and how many league starters play in it.
  const pre = ctx.nfl.filter((g) => g.state === 'pre').sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const onNow = ctx.nfl.filter((g) => g.state === 'in');
  const slate = onNow.length ? onNow : pre.filter((g) => g.kickoff === pre[0]?.kickoff);
  const teamsIn = new Set(slate.flatMap((g) => [g.home.abbr, g.away.abbr]));
  const starters = raw.flatMap((g) => [...g.home.lineup, ...g.away.lineup]).filter((p) => p.team && teamsIn.has(p.team));
  const upcoming: Upcoming | null = slate.length
    ? {
        live: onNow.length > 0,
        title: onNow.length ? 'On now' : windowName(slate[0].kickoff),
        when: onNow.length ? onNow.map((g) => `${g.away.name} at ${g.home.name}, ${g.status}`).join('. ') : `${CT.format(new Date(slate[0].kickoff))} CT`,
        games: slate.map((g) => ({ id: g.id, away: g.away.name, home: g.home.name, awayLogo: g.away.logo, homeLogo: g.home.logo })),
        starters: starters.length,
        names: starters.slice(0, 6).map((p) => (p.position === 'DEF' ? `${p.name} defense` : p.name)),
      }
    : null;

  return (
    <LabShell active="home">
      <Suspense fallback={<RingsSkeleton />}>
        <Rings week={week} />
      </Suspense>
      <Now week={week} mine={mine} initial={live} upcoming={upcoming} />

      <div className={w.grid}>
        <Suspense fallback={<SkeletonCard rows={5} />}>
          <Picture />
        </Suspense>
      </div>
    </LabShell>
  );
}
