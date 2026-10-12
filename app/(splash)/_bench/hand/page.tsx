import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HANDS, type HandKey } from '../../home/hands';
import Squirt from '../../home/Squirt';
import bench from '../../testing.module.css';
import styles from './hand.module.css';

export const metadata: Metadata = {
  title: { absolute: 'The hand' },
  robots: { index: false, follow: false },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const ALL = `https://fonts.googleapis.com/css2?${(Object.keys(HANDS) as HandKey[])
  .map((k) => `family=${HANDS[k].family}`)
  .join('&')}&display=swap`;

/**
 * The hand, seven ways. Each candidate script face does the three jobs it
 * would have in the app: the note on a buried score, Squirt's caption on the
 * closest game, and his tap me note, plus a link to see it on the Home.
 */
export default function HandPage() {
  const keys: HandKey[] = [...(Object.keys(HANDS) as HandKey[]).filter((k) => k !== 'caveat'), 'caveat'];
  return (
    <div className={`${bench.stage} ${styles.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={ALL} precedence="default" />
      <main className={styles.page}>
        <header className={styles.intro}>
          <h1 className={styles.h1}>The hand</h1>
          <p className={styles.lede}>Squirt&rsquo;s pen. Seven different hands, each doing the jobs it would do in the app.</p>
        </header>
        {keys.map((k, n) => {
          const h = HANDS[k];
          const vars = { '--hand': h.css, '--hand-scale': h.scale, '--hand-weight': h.weight } as CSSProperties;
          return (
            <section key={k} className={styles.card} style={vars}>
              <div className={styles.head}>
                <span className={styles.num}>{k === 'caveat' ? 'Now' : n + 1}</span>
                <span className={styles.name}>{h.name}</span>
              </div>
              <p className={styles.note}>{h.note}</p>

              {/* A buried score, circled, with the note. */}
              <div className={styles.demo}>
                <span className={styles.team}>Shough Her Gently</span>
                <span className={styles.score}>
                  <svg className={styles.circle} viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden>
                    <path d="M8 26 C 6 10, 40 3, 66 4 C 96 5, 116 13, 113 27 C 110 42, 76 48, 50 46 C 22 44, 4 38, 9 22 C 11 15, 20 10, 30 8" />
                  </svg>
                  <span className={styles.ouch}>ouch</span>
                  55.42
                </span>
              </div>

              <div className={styles.lines}>
                <span className={styles.sweat}>
                  <Squirt mood="sweat" size={24} />
                  Closest one. Squirt&rsquo;s sweating.
                </span>
                <span className={styles.tap}>Tap me, I&rsquo;ve got more. 1 of 6</span>
              </div>

              <Link href={`/?hand=${k}`} className={styles.try}>
                See it on the Home
              </Link>
            </section>
          );
        })}
      </main>
    </div>
  );
}
