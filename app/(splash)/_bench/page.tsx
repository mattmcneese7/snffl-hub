import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Football, ListNumbers, NewspaperClipping, Strategy } from '@phosphor-icons/react/dist/ssr';
import { toFeature } from '@/lib/feature';
import { getStandings, getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { readIssue, type Article } from '@/lib/rag';
import parts from './color/color.module.css';
import GlassCanvas from '../GlassCanvas';
import ShartCard from './shart/ShartCard';
import styles from '../home.module.css';
import bench from '../testing.module.css';

/**
 * The redesign bench: Home, composed from everything agreed so far. Unlisted,
 * and walled off from the live site (a CSS module and its own full screen
 * layer, with no edit to any live file).
 *
 *   Ground      glow
 *   Glass       WebGL, flat and near clear, lifted one level, and kept for the
 *               blocks that earn it: the matchup, Shart of the Week, the Rag
 *   On ground   the ticker and the standings, parted by space and rules
 *   Type        Switzer on the balanced map: 900 the page title once, 700
 *               section names and the winning score, 600 lead team names, 500
 *               lists, labels, buttons and the losing score, 400 reading
 *   Color      accent only: each manager's own color, a small state set,
 *               one hue per section worn by its buttons
 *   Buttons     B, clear glass, the section's color in the rim, a fill and
 *               one turn of light on press
 *
 * Every figure is live league data.
 */
export const metadata: Metadata = {
  title: { absolute: 'Redesign bench' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const LIFT = 1;
const CLEAR = { 'data-bezel': 5, 'data-body': 0.1, 'data-rim': 0.18, 'data-disp': 0.03 };
const HUE = { matchups: '#005ab4', standings: '#0696a2', swami: '#6b4fd8', rag: '#c0264f' };

function latestArticle(fromWeek: number): { week: number; article: Article } | null {
  for (let w = fromWeek; w >= 1; w--) {
    const issue = readIssue(w);
    if (!issue) continue;
    // Shart of the Week has its own card above, so the Rag leads with
    // something else from the issue.
    const live = issue.articles.filter((a) => !a.retracted && a.category !== 'Shart of the Week');
    const article = live.find((a) => !a.fromTemplate) ?? live[0];
    if (article) return { week: w, article };
  }
  return null;
}

const record = (t: { wins: number; losses: number; ties: number }) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

/** A section button: clear glass in the section's color, going somewhere real. */
function Go({ href, hue, icon, children }: { href: string; hue: string; icon: React.ReactNode; children: string }) {
  return (
    <Link href={href} className={parts.btn} data-glass="button" data-tint={hue} {...CLEAR} style={{ '--acc': hue } as CSSProperties}>
      {icon}
      {children}
    </Link>
  );
}

export default async function TestingHome() {
  const week = await scoredWeek();
  const [rawGames, ctx, standings] = await Promise.all([getWeekGames(week), getMatchupContext(week), getStandings()]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;
  const ticker = games.filter((g) => g !== game);
  const table = [...standings].sort((a, b) => a.seed - b.seed).slice(0, 8);
  const rag = latestArticle(week);

  return (
    <div className={`${bench.stage} ${bench.glow} ${parts.switzer}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <div className={bench.orbs} aria-hidden>
        <span className={bench.orbWhite} />
        <span className={bench.orbGold} />
        <span className={bench.orbPeach} />
        <span className={bench.orbRose} />
        <span className={bench.orbBlue} />
      </div>
      <GlassCanvas className={bench.canvas} />

      <main className={styles.page}>
        <header className={styles.head}>
          <h1 className={parts.title}>Home</h1>
          <span className={styles.week}>Week {week}</span>
        </header>

        {/* ---------- The matchup ---------- */}
        {f ? (
          <section className={styles.block}>
            <article className={`${parts.pane} ${bench.glassC}`} data-glass data-lift={LIFT}>
              <div className={parts.row}>
                <span className={parts.label}>{f.label}</span>
                {f.status === 'live' ? <span className={parts.live}>Live</span> : null}
              </div>
              <div className={parts.sides}>
                {[f.away, f.home].map((side, i, both) => {
                  const lead = side.points >= both[1 - i].points;
                  return (
                    <div
                      key={side.rosterId}
                      className={`${parts.side} ${i === 1 ? parts.right : ''}`}
                      style={{ '--mgr': side.primary } as CSSProperties}
                    >
                      <span className={parts.avatar}>
                        {side.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={side.avatarUrl} alt="" />
                        ) : null}
                      </span>
                      <span className={parts.team}>{side.teamName}</span>
                      <span className={parts.meta}>
                        {side.manager}, {side.record}
                      </span>
                      <span className={`${parts.hero} ${lead ? parts.leadScore : ''}`}>{side.points.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              {f.away.winProb != null && f.home.winProb != null ? (
                <div className={parts.odds}>
                  <div className={parts.oddsNums}>
                    <span>{Math.round(f.away.winProb * 100)}%</span>
                    <span className={parts.oddsLabel}>Win probability</span>
                    <span>{Math.round(f.home.winProb * 100)}%</span>
                  </div>
                  <div className={parts.bar} aria-hidden>
                    <span style={{ flex: f.away.winProb, background: f.away.primary }} />
                    <span style={{ flex: f.home.winProb, background: f.home.primary }} />
                  </div>
                  <p className={parts.line}>
                    <strong className={parts.up}>
                      {(f.away.points >= f.home.points ? f.away : f.home).teamName} up{' '}
                      {Math.abs(f.away.points - f.home.points).toFixed(2)}
                    </strong>
                  </p>
                </div>
              ) : null}
            </article>

            {/* ---------- The rest of the week, on the ground ---------- */}
            {ticker.length ? (
              <ul className={`${parts.bare} ${parts.ticker}`} aria-label="Other games this week">
                {ticker.map((g) => {
                  const awayUp = g.away.points >= g.home.points;
                  return (
                    <li key={g.matchupId} className={parts.tickRow}>
                      <span className={parts.tickTeam}>{g.away.team}</span>
                      <span className={`${parts.tickScore} ${awayUp ? parts.ahead : parts.behind}`}>
                        {g.away.points.toFixed(2)}
                      </span>
                      <span className={`${parts.tickScore} ${awayUp ? parts.behind : parts.ahead}`}>
                        {g.home.points.toFixed(2)}
                      </span>
                      <span className={`${parts.tickTeam} ${parts.tickRight}`}>{g.home.team}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className={styles.actions}>
              <Go href="/matchups" hue={HUE.matchups} icon={<Football className={parts.icon} aria-hidden />}>
                All matchups
              </Go>
            </div>
          </section>
        ) : null}

        {/* ---------- Shart of the Week ---------- */}
        <section className={styles.block}>
          <ShartCard />
        </section>

        {/* ---------- Standings, on the ground ---------- */}
        <section className={styles.block}>
          <h2 className={styles.section}>Standings</h2>
          <ol className={`${parts.table} ${styles.inset}`}>
            <li className={`${parts.tr} ${parts.thead}`} aria-hidden>
              <span />
              <span />
              <span className={parts.colhead}>W-L</span>
              <span className={`${parts.colhead} ${parts.num}`}>PF</span>
            </li>
            {table.map((t, i) => (
              <li
                key={t.rosterId}
                className={`${parts.tr} ${t.inPlayoffs && !table[i + 1]?.inPlayoffs ? parts.cutline : ''}`}
              >
                <span className={parts.seed} style={{ background: t.colors.primary }}>
                  {t.seed}
                </span>
                <span className={parts.who}>
                  <span className={parts.rowTeam}>{t.teamName}</span>
                  <span className={parts.meta}>{t.manager}</span>
                </span>
                <span className={parts.cell}>{record(t)}</span>
                <span className={`${parts.cell} ${parts.num}`}>{t.pointsFor.toFixed(2)}</span>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <Go href="/standings" hue={HUE.standings} icon={<ListNumbers className={parts.icon} aria-hidden />}>
              Full standings
            </Go>
          </div>
        </section>

        {/* ---------- The Rag ---------- */}
        {rag ? (
          <section className={styles.block}>
            <article className={`${parts.pane} ${styles.rag} ${bench.glassC}`} data-glass data-lift={LIFT}>
              <span className={styles.category}>{rag.article.category}</span>
              <h2 className={styles.headline}>{rag.article.headline}</h2>
              <p className={styles.deck}>{rag.article.deck}</p>
              <span className={parts.meta}>
                Week {rag.week}, {rag.article.readTime} min read
              </span>
            </article>
            <div className={styles.actions}>
              <Go
                href={`/rag/${rag.week}/${rag.article.slug}`}
                hue={HUE.rag}
                icon={<NewspaperClipping className={parts.icon} aria-hidden />}
              >
                Read the Rag
              </Go>
              <Go href="/swami" hue={HUE.swami} icon={<Strategy className={parts.icon} aria-hidden />}>
                Ask the Swami
              </Go>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
