import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { toFeature } from '@/lib/feature';
import { getStandings, getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { readIssue, type Article } from '@/lib/rag';
import ShartCard from '../shart/ShartCard';
import { MenuReference } from '../../menus';
import { TickerLine } from '../../TopBar';
import bench from '../../testing.module.css';
import styles from './flow.module.css';

/**
 * Home, rebuilt on one system. A mockup beside the bench Home, not a
 * replacement. The throughline: one sheet of glass, one light, one hand.
 *
 *   1  One material, three thicknesses: the sheet (cards), the strip (a
 *      card's own action, cut from the same sheet), the bar (frosted, only
 *      because content passes under it). One light on all of them.
 *   2  One corner family: 8 for every card and everything cut from one, 16
 *      for the bar. The mark and the avatars are the only circles.
 *   3  Actions belong to their content: each block ends in its own strip.
 *   4  One color rule: ground, glass and ink neutral; a manager's color for
 *      whose; state for what is happening; a section's color once per block,
 *      always in its strip.
 *   5  One rhythm and one header: a 4px grid, 16 gutter, 12 inside, 24
 *      between blocks; every block opens title left, meta right; every line
 *      of type starts on the same edge, 28px in, glass or ground.
 *   6  One motion: a single spring for every press, tab and fill.
 *
 * Ground and glass (Matt, 11 October 2026): light, permanent and universal,
 * one theme. A warm off-white ground with the logo's blue and teal pooling
 * lower down, after his Cora reference, and Lens glass made for it: white,
 * clear, thick edged. The Shart card is the one milky, dirty pane.
 *
 * The menu is the first of the attempts on /menu, the closest to his
 * reference: a white pill bar, every item named, a pastel pill gliding to the
 * chosen one. The ticker runs frameless under it; the "every other game" list
 * is gone, since the ticker always shows those games.
 */
export const metadata: Metadata = {
  title: { absolute: 'Home, on one system' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const HUE = { matchups: '#005ab4', standings: '#0696a2', rag: '#c0264f' };

function latestArticle(fromWeek: number): { week: number; article: Article } | null {
  for (let w = fromWeek; w >= 1; w--) {
    const issue = readIssue(w);
    if (!issue) continue;
    const live = issue.articles.filter((a) => !a.retracted && a.category !== 'Shart of the Week');
    const article = live.find((a) => !a.fromTemplate) ?? live[0];
    if (article) return { week: w, article };
  }
  return null;
}

const record = (t: { wins: number; losses: number; ties: number }) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

/** Every block opens the same way: title left, meta right. */
function Head({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className={styles.head}>
      <h2 className={styles.title}>{title}</h2>
      {meta ? <span className={styles.meta}>{meta}</span> : null}
    </div>
  );
}

/** Every block ends the same way: its own action, in its section's color. */
function Strip({ href, hue, children }: { href: string; hue: string; children: string }) {
  return (
    <Link href={href} className={styles.strip} style={{ '--hue': hue } as CSSProperties}>
      <span>{children}</span>
      <CaretRight className={styles.caret} weight="bold" aria-hidden />
    </Link>
  );
}

export default async function FlowHome() {
  const glass = styles.lensGlass;
  const week = await scoredWeek();
  const [rawGames, ctx, standings] = await Promise.all([getWeekGames(week), getMatchupContext(week), getStandings()]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;
  const others = games.filter((g) => g !== game);
  const table = [...standings].sort((a, b) => a.seed - b.seed).slice(0, 8);
  const rag = latestArticle(week);

  return (
    <div className={`${bench.stage} ${styles.system} ${styles.day}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <div className={styles.lights} aria-hidden>
        <span className={styles.poolWarm} />
        <span className={styles.poolBlue} />
        <span className={styles.poolTeal} />
      </div>

      <div className={styles.menuDock}>
        <MenuReference />
      </div>
      <div className={styles.tickerWrap}>
        <TickerLine
          games={others.map((g) => ({
            id: g.matchupId,
            away: g.away.team,
            awayPts: g.away.points,
            home: g.home.team,
            homePts: g.home.points,
          }))}
        />
      </div>

      <main className={styles.page}>
        <header className={`${styles.head} ${styles.pageHead}`}>
          <h1 className={styles.pageTitle}>Home</h1>
          <span className={styles.meta}>Week {week}</span>
        </header>

        {/* ---------- The closest game: a sheet ---------- */}
        {f ? (
          <article className={`${styles.card} ${glass}`}>
            <Head
              title={f.label}
              meta={f.status === 'live' ? <span className={styles.live}>Live</span> : f.status === 'final' ? 'Final' : 'Upcoming'}
            />
            <div className={styles.sides}>
              {[f.away, f.home].map((side, i, both) => {
                const lead = side.points >= both[1 - i].points;
                return (
                  <div
                    key={side.rosterId}
                    className={`${styles.side} ${i === 1 ? styles.right : ''}`}
                    style={{ '--mgr': side.primary } as CSSProperties}
                  >
                    <span className={styles.avatar}>
                      {side.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={side.avatarUrl} alt="" />
                      ) : null}
                    </span>
                    <span className={styles.team}>{side.teamName}</span>
                    <span className={styles.sub}>
                      {side.manager}, {side.record}
                    </span>
                    <span className={`${styles.score} ${lead ? styles.winning : ''}`}>{side.points.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            {f.away.winProb != null && f.home.winProb != null ? (
              <div className={styles.odds}>
                <div className={styles.bar} aria-hidden>
                  <span style={{ flex: f.away.winProb, background: f.away.primary }} />
                  <span style={{ flex: f.home.winProb, background: f.home.primary }} />
                </div>
                <div className={styles.oddsRow}>
                  <span>{Math.round(f.away.winProb * 100)}%</span>
                  <span className={styles.sub}>to win</span>
                  <span>{Math.round(f.home.winProb * 100)}%</span>
                </div>
              </div>
            ) : null}
            <Strip href="/matchups" hue={HUE.matchups}>
              All matchups
            </Strip>
          </article>
        ) : null}

        {/* ---------- Shart of the Week: a sheet ---------- */}
        <ShartCard flow />

        {/* ---------- Standings: on the ground ---------- */}
        <section className={styles.ground}>
          <Head title="Standings" meta="W-L and points for" />
          <ol className={styles.table}>
            {table.map((t, i) => (
              <li
                key={t.rosterId}
                className={`${styles.row} ${t.inPlayoffs && !table[i + 1]?.inPlayoffs ? styles.cutline : ''}`}
              >
                <span className={styles.seed} style={{ background: t.colors.primary }}>
                  {t.seed}
                </span>
                <span className={styles.who}>
                  <span className={styles.rowTeam}>{t.teamName}</span>
                  <span className={styles.sub}>{t.manager}</span>
                </span>
                <span className={styles.cell}>{record(t)}</span>
                <span className={`${styles.cell} ${styles.end}`}>{t.pointsFor.toFixed(2)}</span>
              </li>
            ))}
          </ol>
          <Strip href="/standings" hue={HUE.standings}>
            Full standings
          </Strip>
        </section>

        {/* ---------- The Rag: a sheet ---------- */}
        {rag ? (
          <article className={`${styles.card} ${glass}`}>
            <Head title="The Rag" meta={`Week ${rag.week}`} />
            <div className={styles.story}>
              <span className={styles.sub}>{rag.article.category}</span>
              <h3 className={styles.headline}>{rag.article.headline}</h3>
              <p className={styles.deck}>{rag.article.deck}</p>
            </div>
            <Strip href={`/rag/${rag.week}/${rag.article.slug}`} hue={HUE.rag}>
              {`Read it, ${rag.article.readTime} min`}
            </Strip>
          </article>
        ) : null}
      </main>

    </div>
  );
}
