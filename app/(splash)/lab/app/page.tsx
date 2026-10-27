import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { photosForWeek } from '@/lib/game-photos';
import { getHighlights } from '@/lib/highlights';
import { teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { publishedWeeks, readIssue } from '@/lib/rag';
import { artForArticles, featuredPlayers } from '@/lib/story-images';
import { getV4Data, type GameView, type SideView } from './data';
import Shell, { HomeHead } from './Shell';
import s from './v4.module.css';

export const metadata: Metadata = { title: { absolute: 'Home, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const CT_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });

function Row({ side }: { side: SideView }) {
  return (
    <span className={`${s.row} ${side.lost ? s.lost : ''}`}>
      <span className={s.av} style={{ width: 26, height: 26, ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" /> : null}
      </span>
      <span className={s.who}>
        <b>{side.team}</b>
        <small>{side.manager}</small>
      </span>
      <span className={s.score}>{side.score.toFixed(2)}</span>
      <small className={s.mark}>
        {side.mark === 'W' || side.mark === 'L' ? <b className={side.mark === 'W' ? s.win : s.loss}>{side.mark}</b> : side.mark}
      </small>
    </span>
  );
}

function GameRow({ g, week }: { g: GameView; week: number }) {
  return (
    <Link href={`/lab/app/matchup?id=${g.id}`} className={s.game}>
      <Row side={g.a} />
      <Row side={g.b} />
      <small className={s.foot}>{g.foot}</small>
    </Link>
  );
}

/**
 * Home, the front page: the Rag leads, then every other matchup as one list.
 * Your own game lives in the score bar, so it is not repeated here.
 */
export default async function V4Home() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);

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

  return (
    <Shell data={data} active="home">
      <HomeHead week={data.week} mine={data.myRoster} />
      {issue && lead ? (
        <article className={s.rag}>
          <Link href={`/rag/${issue.week}`} className={s.ragTop} style={{ textDecoration: 'none' }}>
            <b>The Rag</b>
            <span>
              Week {issue.week} &middot; {CT_DATE.format(new Date(issue.publishedAt))}
            </span>
          </Link>
          <Link href={`/rag/${issue.week}/${lead.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
              <Link key={a.slug} href={`/rag/${issue.week}/${a.slug}`} className={s.ragRow}>
                <small>{a.category}</small>
                <b>{a.headline}</b>
              </Link>
            ))}
          </div>
        </article>
      ) : null}
      <div className={s.title}>
        <h2>All Matchups</h2>
        
      </div>
      {data.others.length ? (
        <div className={s.list}>
          {data.others.map((g) => (
            <GameRow key={g.id} g={g} week={data.week} />
          ))}
        </div>
      ) : (
        <p className={s.empty}>No matchups for week {data.week} yet.</p>
      )}
    </Shell>
  );
}
