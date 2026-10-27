import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { photosForWeek } from '@/lib/game-photos';
import { getHighlights } from '@/lib/highlights';
import { teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { artForArticles, featuredPlayers } from '@/lib/story-images';
import { Fragment, type ReactNode } from 'react';
import { firstNameOf } from '@/config/managers';
import { latestChug } from '@/lib/chug-video';
import { teamByRoster } from '@/lib/league';
import { trophyBoard } from './cached';
import { getV4Data, type GameView, type SideView } from './data';
import { momentOf, orderOf, type ModuleKey } from './schedule';
import { LivePoints } from './live/Live';
import ChugPop from './ChugPop';
import Moments, { type MomentKind } from './Moments';
import ChugCounts from './modules/ChugCounts';
import FeedDigest from './modules/FeedDigest';
import FilmTile from './modules/FilmTile';
import Hardware from './modules/Hardware';
import LatestTrade from './modules/LatestTrade';
import NflScores from './modules/NflScores';
import SquirtSays from './modules/SquirtSays';
import TopScorers from './modules/TopScorers';
import Shell, { HomeHead } from './Shell';
import s from './v4.module.css';

export const metadata: Metadata = { title: { absolute: 'Home, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const CT_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });

function Row({ side, week, live }: { side: SideView; week: number; live: boolean }) {
  return (
    <span className={`${s.row} ${side.lost ? s.lost : ''}`}>
      <span className={s.av} style={{ width: 26, height: 26, ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" /> : null}
      </span>
      <span className={s.who}>
        <b>{side.team}</b>
        <small>{side.manager}</small>
      </span>
      <span className={s.score}>{live ? <LivePoints week={week} rosterId={side.rosterId} fallback={side.score} /> : side.score.toFixed(2)}</span>
      <small className={s.mark}>
        {side.mark === 'W' || side.mark === 'L' ? <b className={side.mark === 'W' ? s.win : s.loss}>{side.mark}</b> : side.mark}
      </small>
    </span>
  );
}

function GameRow({ g, week, live }: { g: GameView; week: number; live: boolean }) {
  return (
    <Link href={`/lab/app/matchup?id=${g.id}`} className={s.game}>
      <Row side={g.a} week={week} live={live} />
      <Row side={g.b} week={week} live={live} />
      <small className={s.foot}>{g.foot}</small>
    </Link>
  );
}

/**
 * The chug: whoever finished last that week, and whether they have paid.
 * Shown while the chug is owed.
 */
function ChugCard({ rosterId, week }: { rosterId: number; week: number }) {
  const t = teamByRoster(rosterId);
  return (
    <section aria-label={`Week ${week} chug`}>
      <div className={s.title}>
        <h2>The Chug</h2>
        <Link href="/lab/app/chug">Chug Meter</Link>
      </div>
      <div className={s.chugCard}>
        <span className={s.av} style={{ width: 40, height: 40, ['--mgr' as string]: t?.colors?.primary }}>
          {t?.avatarUrl ? <img src={t.avatarUrl} alt="" /> : null}
        </span>
        <span className={s.who}>
          <b>{t?.teamName ?? ''}</b>
          <small>
            {firstNameOf(rosterId) ?? t?.manager} &middot; Week {week} Shart
          </small>
        </span>
        <span className={s.chugDue}>
          <b>Owes a chug</b>
          <small>Due Sunday 12:00 PM</small>
        </span>
      </div>
    </section>
  );
}

/**
 * Home, the front page. The same modules every week, in an order set by the
 * moment (see schedule.ts): the awards and the chug after a final, the Rag
 * midweek, Squirt's reads on a game day morning, every matchup once games
 * are on. Your own game lives in the score bar, so it is not repeated here.
 */
export default async function V4Home({ searchParams }: { searchParams: Promise<{ at?: string; moment?: string }> }) {
  const sp = await searchParams;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, board] = await Promise.all([getV4Data(mine), trophyBoard().catch(() => null)]);
  const moment = momentOf(data.state, data.games.some((g) => g.inPlay), sp.at);
  const shart = board?.latest.find((a) => a.kind === 'shart');
  const chug = latestChug(data.week);
  const paid = Boolean(shart && chug && chug.week === shart.week);
  const won = data.state === 'final' && data.mine?.a.mark === 'W';
  const sharted = mine != null && shart?.rosterId === mine;
  const forced = sp.moment === 'win' || sp.moment === 'flush' ? (sp.moment as MomentKind) : null;

  const weeks = publishedWeeks();
  const ragWeek = weeks.length ? weeks[weeks.length - 1] : null;
  const issue = ragWeek ? readIssue(ragWeek) : null;
  const articles = (issue?.articles ?? []).filter((a) => !a.retracted);
  const [clips, featured] = ragWeek ? await Promise.all([getHighlights(ragWeek, 200).catch(() => []), featuredPlayers(ragWeek).catch(() => [])]) : [[], []];
  const art = artForArticles(
    articles.slice(0, 8),
    clips,
    Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
    featured,
    ragWeek ? photosForWeek(ragWeek) : [],
  );
  const lead = articles[0];
  const leadArt = lead ? art[lead.slug] : undefined;
  const leadSrc = leadArt ? (leadArt.kind === 'photo' ? leadArt.src : leadArt.cutout) : null;

  const live = moment === 'live';
  const modules: Record<ModuleKey, ReactNode> = {
    rag: issue && lead ? (
        <article className={s.rag}>
          <Link href={`/lab/app/rag/${issue.week}`} className={s.ragTop} style={{ textDecoration: 'none' }}>
            <b>The Rag</b>
            <span>
              Week {issue.week} &middot; {CT_DATE.format(new Date(issue.publishedAt))}
            </span>
          </Link>
          <Link href={`/lab/app/rag/${issue.week}/${lead.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {leadSrc ? (
              <span className={s.ragArt} style={{ display: 'block' }}>
                <img src={leadSrc} alt="" />
                <span className={s.ragTag}>{lead.category}</span>
              </span>
            ) : null}
            <span className={s.ragBody}>
              <h3>{lead.headline}</h3>
              <p>{lead.deck}</p>
              <span className={s.ragBy}>{lead.readTime} min read</span>
            </span>
          </Link>
          <div className={s.ragList}>
            {articles.slice(1, 3).map((a) => (
              <Link key={a.slug} href={`/lab/app/rag/${issue.week}/${a.slug}`} className={s.ragRow}>
                <small>{a.category}</small>
                <b>{a.headline}</b>
              </Link>
            ))}
          </div>
        </article>
      ) : null,
    hardware: board ? <Hardware board={board} /> : null,
    // Owed until the film is in; once paid, the Film tile carries it.
    chug: shart?.week != null && !paid ? <ChugCard rosterId={shart.rosterId} week={shart.week} /> : null,
    film: <FilmTile week={data.week} />,
    scorers: <TopScorers week={data.week} mine={mine} />,
    matchups: (
      <>
        <div className={s.title}>
        <h2>{live ? 'Live Matchups' : 'All Matchups'}</h2>
        
      </div>
      {data.others.length ? (
        <div className={s.list}>
          {data.others.map((g) => (
            <GameRow key={g.id} g={g} week={data.week} live={data.state === 'live'} />
          ))}
        </div>
      ) : (
        <p className={s.empty}>No matchups for week {data.week} yet.</p>
      )}
      </>
    ),
    nfl: <NflScores week={data.week} />,
    squirt: <SquirtSays week={data.week} mine={mine} />,
    trade: <LatestTrade mine={mine} />,
    feed: <FeedDigest mine={mine} />,
    chugs: <ChugCounts mine={mine} />,
  };

  return (
    <Shell data={data} active="home">
      <HomeHead week={data.week} mine={data.myRoster} />
      {orderOf(moment).map((k) => (
        <Fragment key={k}>{modules[k]}</Fragment>
      ))}
      <Moments week={data.week} won={won} sharted={sharted} name={mine != null ? (firstNameOf(mine) ?? null) : null} force={forced} />
      {chug ? <ChugPop week={chug.week} src={chug.src} who={(() => {
        const a = board?.all.find((x) => x.kind === 'shart' && x.week === chug.week);
        return a ? (teamByRoster(a.rosterId)?.teamName ?? null) : null;
      })()} /> : null}
    </Shell>
  );
}
