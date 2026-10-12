import type { Metadata } from 'next';
import { toFeature } from '@/lib/feature';
import { getStandings, getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { readIssue, type Article } from '@/lib/rag';
import GlassCanvas from '../../GlassCanvas';
import bench from '../../testing.module.css';
import { encodeSans, googleSansFlex, recursive } from './fonts';
import styles from './type.module.css';

/**
 * Type options, on the settled ground and glass.
 *
 * Round 3. Round 1 (Scoreboard, Precision, Press) was too bold and too
 * scoreboard; round 2 (Plex, Mona, Roboto Flex) was the wrong faces and too
 * airy. Kept from round 2: the house cut approach, each face tuned on its own
 * axes. New here: three new faces, and a dense layout so a phone shows the
 * matchup, the standings and the start of the Rag before any scrolling.
 *
 * The content is real: this week's closest game, the actual standings, and
 * the latest Rag headline. Everything but the type is held still, including
 * the navy text color, which is a placeholder and not yet agreed.
 *
 * ?v=a, b or c.
 */
export const metadata: Metadata = {
  title: { absolute: 'Type options' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const VERSIONS = {
  a: {
    name: 'Recursive',
    faces: 'Recursive, Linear cut',
    note: 'One file. Words set proportional, every figure on the same face switched to monospace, so data columns lock without a second family.',
    fonts: recursive.variable,
  },
  b: {
    name: 'Google Sans Flex',
    faces: 'Google Sans Flex, tuned',
    note: 'Rounding off for crisp terminals, a finer grade, a touch narrow, optical size per role.',
    fonts: googleSansFlex.variable,
  },
  c: {
    name: 'Encode Sans',
    faces: 'Encode Sans, width cut',
    note: 'A plain grotesk on a wide width axis: words semi condensed, figures condensed. The densest of the three.',
    fonts: encodeSans.variable,
  },
} as const;
type Version = keyof typeof VERSIONS;

/** The newest Rag article that was written, not filled in from a template. */
function latestArticle(fromWeek: number): Article | null {
  for (let w = fromWeek; w >= 1; w--) {
    const issue = readIssue(w);
    if (!issue) continue;
    const live = issue.articles.filter((a) => !a.retracted);
    return live.find((a) => !a.fromTemplate) ?? live[0] ?? null;
  }
  return null;
}

/** "Closest Game" to "Closest game": labels are sentence case. */
const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const record = (t: { wins: number; losses: number; ties: number }) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

export default async function TypePage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const version: Version = v === 'b' || v === 'c' ? v : 'a';
  const spec = VERSIONS[version];

  const week = await scoredWeek();
  const [rawGames, ctx, standings] = await Promise.all([
    getWeekGames(week),
    getMatchupContext(week),
    getStandings(),
  ]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const feature = game ? toFeature(game, 'Closest Game', winProbabilities(games, ctx).get(game.matchupId)) : null;
  const top = [...standings].sort((a, b) => a.seed - b.seed).slice(0, 6);
  const article = latestArticle(week);

  return (
    <div className={`${bench.stage} ${bench.glow} ${spec.fonts} ${styles[`v${version}`]}`} data-stage>
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
          <span className={styles.eyebrow}>Week {week}</span>
        </header>

        {feature ? (
          <section className={`${styles.pane} ${bench.glassC}`} data-glass>
            <div className={styles.row}>
              <span className={styles.label}>{sentence(feature.label)}</span>
              <span className={`${styles.label} ${feature.status === 'live' ? styles.emph : ''}`}>
                {feature.status === 'final' ? 'Final' : feature.status === 'live' ? 'Live' : 'Upcoming'}
              </span>
            </div>
            <div className={styles.sides}>
              {[feature.away, feature.home].map((side, i, both) => {
                const lead = side.points >= both[1 - i].points;
                return (
                  <div key={side.rosterId} className={`${styles.side} ${i === 1 ? styles.right : ''}`}>
                    <span className={styles.team}>{side.teamName}</span>
                    <span className={styles.meta}>
                      {side.manager} · {side.record}
                    </span>
                    <span className={`${styles.score} ${lead ? styles.lead : ''}`}>{side.points.toFixed(2)}</span>
                    {side.projected != null ? (
                      <span className={styles.num}>proj {side.projected.toFixed(1)}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {feature.away.winProb != null && feature.home.winProb != null ? (
              <div className={styles.row}>
                <span className={styles.pct}>{Math.round(feature.away.winProb * 100)}%</span>
                <span className={styles.label}>Win probability</span>
                <span className={styles.pct}>{Math.round(feature.home.winProb * 100)}%</span>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={`${styles.pane} ${bench.glassC}`} data-glass>
          <span className={styles.label}>Standings</span>
          <ol className={styles.table}>
            {top.map((t) => (
              <li key={t.rosterId} className={styles.tr}>
                <span className={styles.seed}>{t.seed}</span>
                <span className={styles.who}>
                  <span className={styles.rowTeam}>{t.teamName}</span>
                  <span className={styles.meta}>{t.manager}</span>
                </span>
                <span className={styles.num}>{record(t)}</span>
                <span className={styles.num}>{t.pointsFor.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>

        {article ? (
          <section className={`${styles.pane} ${bench.glassC}`} data-glass>
            <span className={styles.label}>{article.category}</span>
            <h2 className={styles.headline}>{article.headline}</h2>
            <p className={styles.deck}>{article.deck}</p>
            <span className={styles.meta}>{article.readTime} min read</span>
          </section>
        ) : null}

        <footer className={styles.about}>
          <nav className={styles.switcher} aria-label="Type option">
            {(Object.keys(VERSIONS) as Version[]).map((key) => (
              <a
                key={key}
                href={`/type?v=${key}`}
                className={key === version ? styles.on : undefined}
                aria-current={key === version ? 'page' : undefined}
              >
                {key.toUpperCase()} {VERSIONS[key].name}
              </a>
            ))}
          </nav>
          <p className={styles.note}>
            <strong>{spec.faces}.</strong> {spec.note}
          </p>
        </footer>
      </main>
    </div>
  );
}
