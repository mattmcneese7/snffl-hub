import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { FootballHelmet, NewspaperClipping, Strategy } from '@phosphor-icons/react/dist/ssr';
import { toFeature } from '@/lib/feature';
import { getWeekGames, matchupOfTheWeek, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay, winProbabilities } from '@/lib/matchup-live';
import { MarkDropRefined } from '../../marks';
import bench from '../../testing.module.css';
import styles from './brand.module.css';

/**
 * Color sets for the identity. Matt liked the system, the blue and the
 * highlighter, and wants it softer and more sophisticated: pastel rather than
 * deep primaries. Every set is the same two partners with fixed jobs:
 *
 *   Blue         structure: the chosen tab as a soft fill, quiet surfaces, and
 *                a deep blue of the same family for links and accents in type
 *   Highlighter  emphasis only: swiped under the winning score and the call
 *                to action, never as text
 *
 * The mark stays plain black; the wordmark's tittles are drops in the deep
 * blue. Shown on this week's real closest game.
 */
export const metadata: Metadata = {
  title: { absolute: 'Brand color' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

const SETS = [
  {
    key: 'pool',
    name: '1. Pool',
    idea: 'Powder blue and a soft lime highlighter. The brightest of the four, still clearly pastel.',
    chips: [
      ['Paper', '#f7f6f2'],
      ['Powder', '#c9dcfa'],
      ['Lime', '#ecf88a'],
      ['Deep blue', '#2d4c9c'],
      ['Ink', '#141518'],
    ],
  },
  {
    key: 'mist',
    name: '2. Mist',
    idea: 'Gray blue and a buttery citron. The most muted: calm, grown up, the highlighter almost a wash.',
    chips: [
      ['Paper', '#f5f4f0'],
      ['Mist', '#d3dee9'],
      ['Citron', '#f1f2a6'],
      ['Slate', '#36536f'],
      ['Ink', '#16181b'],
    ],
  },
  {
    key: 'peri',
    name: '3. Periwinkle',
    idea: 'Periwinkle and chartreuse. A cooler, more fashion take: the blue leans violet, the green leans sharp.',
    chips: [
      ['Paper', '#f8f7f4'],
      ['Periwinkle', '#d2d6fb'],
      ['Chartreuse', '#e4f590'],
      ['Indigo', '#3a43a4'],
      ['Ink', '#141518'],
    ],
  },
  {
    key: 'ice',
    name: '4. Ice and lime',
    idea: 'Ice blue toward the logo’s teal, with a fresh lime. Closest to the drop’s water.',
    chips: [
      ['Paper', '#f6f6f3'],
      ['Ice', '#d3ebf4'],
      ['Lime', '#def87e'],
      ['Deep teal', '#1d5c76'],
      ['Ink', '#131518'],
    ],
  },
] as const;

function Drop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z" fill="currentColor" />
    </svg>
  );
}

function Wordmark() {
  const i = (
    <span className={styles.i}>
      ı<Drop className={styles.tittle} />
    </span>
  );
  return (
    <span className={styles.wordmark} aria-label="Squirtnite">
      <span aria-hidden>
        Squ{i}rtn{i}te
      </span>
    </span>
  );
}

export default async function BrandPage() {
  const week = await scoredWeek();
  const [rawGames, ctx] = await Promise.all([getWeekGames(week), getMatchupContext(week)]);
  const games = markInPlay(rawGames, ctx.nfl);
  const game = matchupOfTheWeek(games);
  const f = game ? toFeature(game, 'Closest game', winProbabilities(games, ctx).get(game.matchupId)) : null;

  return (
    <div className={`${bench.stage} ${styles.page}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <main className={styles.main}>
        <header className={styles.head}>
          <h1 className={styles.title}>Brand color</h1>
          <p className={styles.sub}>
            Blue for structure, highlighter for emphasis, softened four ways. The mark stays black.
          </p>
        </header>

        {SETS.map((set) => (
          <section key={set.key} className={`${styles.board} ${styles[set.key]}`}>
            <div className={styles.copy}>
              <h2 className={styles.name}>{set.name}</h2>
              <p className={styles.idea}>{set.idea}</p>
            </div>

            <ul className={styles.chips} aria-label="Palette">
              {set.chips.map(([label, hex]) => (
                <li key={label} className={styles.chip}>
                  <span className={styles.swatch} style={{ background: hex }} />
                  <span className={styles.chipName}>{label}</span>
                  <span className={styles.chipHex}>{hex}</span>
                </li>
              ))}
            </ul>

            <div className={styles.lockup}>
              <span className={styles.mark}>
                <MarkDropRefined />
              </span>
              <Wordmark />
            </div>

            <nav className={styles.menu} aria-label="Sections, example">
              <span className={`${styles.item} ${styles.on}`}>
                <span className={styles.icon}>
                  <MarkDropRefined />
                </span>
                <span className={styles.label}>Home</span>
              </span>
              <span className={styles.item}>
                <FootballHelmet className={styles.icon} weight="fill" aria-hidden />
                <span className={styles.label}>Scores</span>
              </span>
              <span className={styles.item}>
                <NewspaperClipping className={styles.icon} weight="fill" aria-hidden />
                <span className={styles.label}>Rag</span>
              </span>
              <span className={styles.item}>
                <Strategy className={styles.icon} weight="fill" aria-hidden />
                <span className={styles.label}>More</span>
              </span>
            </nav>

            {f ? (
              <article className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardTitle}>Closest game</span>
                  {f.status === 'live' ? (
                    <span className={styles.live}>
                      <Drop className={styles.liveDrop} />
                      Live
                    </span>
                  ) : null}
                </div>
                <div className={styles.sides}>
                  {[f.away, f.home].map((side, i, both) => {
                    const lead = side.points >= both[1 - i].points;
                    return (
                      <div
                        key={side.rosterId}
                        className={`${styles.side} ${i === 1 ? styles.right : ''}`}
                        style={{ '--mgr': side.primary } as CSSProperties}
                      >
                        <span className={styles.team}>{side.teamName}</span>
                        <span className={`${styles.score} ${lead ? styles.winning : ''}`}>
                          <span>{side.points.toFixed(2)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.chipRow}>
                  <span className={styles.tag}>Week {week}</span>
                  <span className={styles.tag}>Game of the week</span>
                </div>
                <span className={styles.cta}>
                  <span>All matchups</span>
                </span>
              </article>
            ) : null}
          </section>
        ))}
      </main>
    </div>
  );
}
