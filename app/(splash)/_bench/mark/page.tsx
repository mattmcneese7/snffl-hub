import type { Metadata } from 'next';
import { MarkDrop, MarkDropRefined, MarkDropSeam, MarkDropWet, MarkToday } from '../../marks';
import { MenuWithMark } from '../../menus';
// The bench's base first, then the ground's tokens over it: order matters.
import bench from '../../testing.module.css';
import flow from '../flow/flow.module.css';
import styles from './mark.module.css';

/**
 * The mark, pushed from Matt's pick (A, the drop). Each refinement is shown as
 * the app icon both ways round, at the small sizes it has to survive, as a
 * lockup with the name, and as Home in the menu.
 */
export const metadata: Metadata = {
  title: { absolute: 'Mark options' },
  robots: { index: false, follow: false },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

const OPTIONS = [
  {
    name: 'A. Drop, as picked',
    idea: 'A truer drop, four stitches on a long spine, no face.',
    Mark: MarkDrop,
  },
  {
    name: 'A1. Refined',
    idea: 'More air: three stitches on a shorter spine, sitting low where the drop is widest.',
    Mark: MarkDropRefined,
  },
  {
    name: 'A2. Seam',
    idea: 'The lace curves across the body like a seam round a ball, so the drop reads as round and moving.',
    Mark: MarkDropSeam,
  },
  {
    name: 'A3. Wet',
    idea: 'The refined laces plus a glint cut high on the left, where light catches a wet surface. Glassy, like the app.',
    Mark: MarkDropWet,
  },
];

export default function MarkPage() {
  return (
    <div className={`${bench.stage} ${flow.system} ${flow.day}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <div className={flow.lights} aria-hidden>
        <span className={flow.poolWarm} />
        <span className={flow.poolBlue} />
        <span className={flow.poolTeal} />
      </div>

      <main className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>The mark</h1>
          <p className={styles.sub}>Your pick, A, pushed three ways. Today&apos;s mark is at the bottom for comparison.</p>
        </header>

        {OPTIONS.map(({ name, idea, Mark }) => (
          <section key={name} className={styles.option}>
            <div className={styles.optHead}>
              <h2 className={styles.optName}>{name}</h2>
              <p className={styles.idea}>{idea}</p>
            </div>
            <div className={styles.row}>
              <div className={styles.icon}>
                <Mark tone="brand" />
              </div>
              <div className={`${styles.icon} ${styles.iconBrand}`}>
                <Mark />
              </div>
              <div className={styles.sizes} aria-label="Small sizes">
                {[28, 20, 16].map((px) => (
                  <span key={px} className={styles.size} style={{ width: px, height: px }}>
                    <Mark />
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.lockup}>
              <span className={styles.lockMark}>
                <Mark tone="brand" />
              </span>
              <span className={styles.word}>Squirtnite</span>
            </div>
            <div className={styles.menuRow}>
              <MenuWithMark mark={<Mark />} />
            </div>
          </section>
        ))}

        <section className={styles.option}>
          <div className={styles.optHead}>
            <h2 className={styles.optName}>Today</h2>
            <p className={styles.idea}>The drop with laces and eyes, as it stands.</p>
          </div>
          <div className={styles.row}>
            <div className={styles.icon}>
              <MarkToday />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
