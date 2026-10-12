import type { Metadata } from 'next';
import { toFeature } from '@/lib/feature';
import { getStandings, getTopPerformers, getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { readIssue, type Article } from '@/lib/rag';
import GlassCanvas from '../../../GlassCanvas';
import bench from '../../../testing.module.css';
import styles from './switzer.module.css';

/**
 * Switzer, element by element. The face is settled; this page is for working
 * through how its 100 to 900 range is applied across the site's real elements.
 * Every pane carries a key naming the weight each role uses, so the map can be
 * argued with line by line. Content is live league data. The navy ink and the
 * control styling are placeholders, not agreed.
 *
 * Switzer loads here from Fontshare's CSS service as the variable roman and
 * italic (one file each, 100 to 900). Production would self host it.
 */
export const metadata: Metadata = {
  title: { absolute: 'Switzer elements' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

function latestArticle(fromWeek: number): Article | null {
  for (let w = fromWeek; w >= 1; w--) {
    const issue = readIssue(w);
    if (!issue) continue;
    const live = issue.articles.filter((a) => !a.retracted);
    return live.find((a) => !a.fromTemplate) ?? live[0] ?? null;
  }
  return null;
}

const record = (t: { wins: number; losses: number; ties: number }) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;
const stateOf = (s: 'pending' | 'live' | 'final') => (s === 'final' ? 'Final' : s === 'live' ? 'Live' : 'Upcoming');

/** A pane's weight key: role, then weight. */
function Key({ items }: { items: [string, string][] }) {
  return (
    <p className={styles.key}>
      {items.map(([role, w]) => (
        <span key={role}>
          {role} <b>{w}</b>
        </span>
      ))}
    </p>
  );
}

export default async function SwitzerPage() {
  const week = await scoredWeek();
  const [rawGames, ctx, standings, top] = await Promise.all([
    getWeekGames(week),
    getMatchupContext(week),
    getStandings(),
    getTopPerformers(week, 4),
  ]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;
  const table = [...standings].sort((a, b) => a.seed - b.seed).slice(0, 5);
  const article = latestArticle(week);
  const ticker = games.filter((g) => g !== game).slice(0, 4);

  return (
    <div className={`${bench.stage} ${bench.glow} ${styles.switzer}`} data-stage>
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
          <h1 className={styles.title}>Home</h1>
          <span className={styles.week}>Week {week}</span>
        </header>

        {f ? (
          <section className={`${styles.pane} ${bench.glassC}`} data-glass>
            <div className={styles.row}>
              <span className={styles.label}>{f.label}</span>
              <span className={styles.tag}>{stateOf(f.status)}</span>
            </div>
            <div className={styles.sides}>
              {[f.away, f.home].map((side, i, both) => {
                const lead = side.points >= both[1 - i].points;
                return (
                  <div key={side.rosterId} className={`${styles.side} ${i === 1 ? styles.right : ''}`}>
                    <span className={styles.team}>{side.teamName}</span>
                    <span className={`${styles.meta} ${styles.pair}`}>
                      <span>{side.manager}</span>
                      <span>{side.record}</span>
                    </span>
                    <span className={`${styles.hero} ${lead ? styles.lead : ''}`}>{side.points.toFixed(2)}</span>
                    {side.projected != null ? <span className={styles.meta}>proj {side.projected.toFixed(1)}</span> : null}
                  </div>
                );
              })}
            </div>
            {f.away.winProb != null && f.home.winProb != null ? (
              <p className={styles.line}>
                <strong className={styles.strong}>
                  {(f.away.points >= f.home.points ? f.away : f.home).teamName} up{' '}
                  {Math.abs(f.away.points - f.home.points).toFixed(2)}
                </strong>
                , win probability {Math.round(f.away.winProb * 100)}% to {Math.round(f.home.winProb * 100)}%
              </p>
            ) : null}
            <Key
              items={[
                ['label', '500'],
                ['tag', '800 caps'],
                ['team', '500'],
                ['meta', '400'],
                ['score', '500'],
                ['bold', '700'],
              ]}
            />
          </section>
        ) : null}

        {ticker.length ? (
          <section className={`${styles.pane} ${bench.glassC}`} data-glass>
            <span className={styles.label}>Around the league</span>
            <ul className={styles.ticker}>
              {ticker.map((g) => (
                <li key={g.matchupId} className={styles.tickRow}>
                  <span className={styles.tickTeam}>{g.away.team}</span>
                  <span className={styles.tickScore}>{g.away.points.toFixed(2)}</span>
                  <span className={styles.tickScore}>{g.home.points.toFixed(2)}</span>
                  <span className={`${styles.tickTeam} ${styles.tickRight}`}>{g.home.team}</span>
                </li>
              ))}
            </ul>
            <Key items={[['team', '400'], ['score', '600']]} />
          </section>
        ) : null}

        <section className={`${styles.pane} ${bench.glassC}`} data-glass>
          <span className={styles.label}>Standings</span>
          <ol className={styles.table}>
            <li className={`${styles.tr} ${styles.thead}`} aria-hidden>
              <span />
              <span />
              <span className={styles.colheads}>W-L</span>
              <span className={`${styles.colheads} ${styles.pf}`}>PF</span>
            </li>
            {table.map((t) => (
              <li key={t.rosterId} className={styles.tr}>
                <span className={styles.seed}>{t.seed}</span>
                <span className={styles.who}>
                  <span className={styles.rowTeam}>{t.teamName}</span>
                  <span className={styles.meta}>{t.manager}</span>
                </span>
                <span className={styles.cell}>{record(t)}</span>
                <span className={`${styles.cell} ${styles.pf}`}>{t.pointsFor.toFixed(2)}</span>
              </li>
            ))}
          </ol>
          <Key items={[['seed', '500'], ['team', '500'], ['manager', '400'], ['figures', '400']]} />
        </section>

        {top.length ? (
          <section className={`${styles.pane} ${bench.glassC}`} data-glass>
            <span className={styles.label}>Top performers, week {week}</span>
            <ul className={styles.players}>
              {top.map((p) => (
                <li key={p.id} className={styles.player}>
                  <span className={styles.who}>
                    <span className={styles.rowTeam}>{p.name}</span>
                    <span className={`${styles.meta} ${styles.pair}`}>
                      <span>{p.position}</span>
                      {p.team ? <span>{p.team}</span> : null}
                    </span>
                  </span>
                  <span className={styles.figure}>{p.points.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <Key items={[['name', '500'], ['position', '400'], ['points', '500']]} />
          </section>
        ) : null}

        {article ? (
          <section className={`${styles.pane} ${bench.glassC}`} data-glass>
            <span className={styles.tag}>{article.category}</span>
            <h2 className={styles.headline}>{article.headline}</h2>
            <p className={styles.deck}>{article.deck}</p>
            {article.body[0] ? <p className={styles.body}>{article.body[0]}</p> : null}
            <span className={styles.meta}>{article.readTime} min read</span>
            <Key
              items={[
                ['category', '800 caps'],
                ['headline', '600'],
                ['deck', '400 italic'],
                ['body', '400'],
              ]}
            />
          </section>
        ) : null}

        <section className={styles.scale} aria-label="Switzer weights">
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
            <div key={w} className={styles.step} style={{ fontWeight: w }}>
              <span className={styles.stepNum}>{w}</span>
              <span>First Down Syndrome 135.04</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
