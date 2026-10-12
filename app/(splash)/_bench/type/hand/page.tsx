import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { scoredWeek } from '@/lib/league';
import { readIssue, type Article } from '@/lib/rag';
import bench from '../../../testing.module.css';
import { allHands } from './fonts';
import styles from './hand.module.css';

/**
 * The handwritten voice, recast. Permanent Marker stays in the concept (the
 * league's shame and joke moments) but not as the face: it is chunky and loud,
 * and the new look is thin, light glass set in Switzer. Each card sets the
 * real Shart of the Week beside Switzer, so the hand is judged next to what it
 * will actually live with.
 */
export const metadata: Metadata = {
  title: { absolute: 'Hand wall' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const FONTSHARE = 'https://api.fontshare.com/v2/css?f[]=switzer@1&f[]=comico@400&display=swap';

type Hand = { name: string; kind: string; family: string; size: number; weight?: number };

const HANDS: Hand[] = [
  { name: 'Reenie Beanie', kind: 'fine felt tip', family: 'var(--h-reenie)', size: 30 },
  { name: 'Nanum Pen Script', kind: 'quick pen', family: 'var(--h-nanum)', size: 30 },
  { name: 'Shadows Into Light Two', kind: 'fine pen, upright', family: 'var(--h-shadows)', size: 24 },
  { name: 'Nothing You Could Do', kind: 'fast scrawl', family: 'var(--h-nothing)', size: 21 },
  { name: 'Covered By Your Grace', kind: 'felt tip, loose', family: 'var(--h-covered)', size: 26 },
  { name: 'Mynerve', kind: 'neat pen', family: 'var(--h-mynerve)', size: 23 },
  { name: 'Edu SA Hand', kind: 'school hand, weight axis', family: 'var(--h-edusa)', size: 23, weight: 500 },
  { name: 'Playpen Sans', kind: 'printed hand, weights 100 to 800', family: 'var(--h-playpen)', size: 21, weight: 500 },
  { name: 'Caveat Brush', kind: 'brush marker', family: 'var(--h-caveat)', size: 27 },
  { name: 'Mansalva', kind: 'dry marker', family: 'var(--h-mansalva)', size: 24 },
  { name: 'Sedgwick Ave', kind: 'graffiti marker', family: 'var(--h-sedgwick)', size: 23 },
  { name: 'Just Another Hand', kind: 'narrow marker', family: 'var(--h-justanother)', size: 31 },
  { name: 'Comico', kind: 'Fontshare, comic hand', family: "'Comico'", size: 22 },
];

/** The newest Shart of the Week, from the Rag. */
function latestShart(fromWeek: number): Article | null {
  for (let w = fromWeek; w >= 1; w--) {
    const shart = readIssue(w)?.articles.find((a) => a.id === 'shart' && !a.retracted);
    if (shart) return shart;
  }
  return null;
}

export default async function HandPage() {
  const week = await scoredWeek();
  const shart = latestShart(week);
  const score = shart?.deck.match(/[\d.]+(?= points)/)?.[0] ?? null;
  const verdict = shart?.body.at(-1) ?? null;

  return (
    <div className={`${bench.stage} ${bench.glow} ${allHands} ${styles.switzer}`}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTSHARE} precedence="default" />
      <div className={bench.orbs} aria-hidden>
        <span className={bench.orbWhite} />
        <span className={bench.orbGold} />
        <span className={bench.orbPeach} />
        <span className={bench.orbRose} />
        <span className={bench.orbBlue} />
      </div>

      <main className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Hand</h1>
          <span className={styles.sub}>The shame voice, beside Switzer</span>
        </header>

        {shart
          ? HANDS.map((h, i) => (
              <section
                key={h.name}
                className={`${styles.card} ${bench.glassC}`}
                style={{ '--hand': h.family, '--hand-size': `${h.size}px`, '--hand-weight': h.weight ?? 400 } as CSSProperties}
              >
                <div className={styles.top}>
                  <span className={styles.name}>
                    {i + 1}. {h.name}
                  </span>
                  <span className={styles.kind}>{h.kind}</span>
                </div>
                <div className={styles.body}>
                  <div className={styles.facts}>
                    <span className={styles.tag}>{shart.category}</span>
                    {score ? <span className={styles.figure}>{score}</span> : null}
                  </div>
                  <div className={styles.scrawl}>
                    <span className={styles.handLine}>{shart.headline}</span>
                    {verdict ? <span className={styles.handNote}>{verdict}</span> : null}
                  </div>
                </div>
              </section>
            ))
          : null}
      </main>
    </div>
  );
}
