import type { Metadata } from 'next';
import { BellSimple, NewspaperClipping, Strategy, ShareNetwork, UsersThree } from '@phosphor-icons/react/dist/ssr';
import GlassCanvas from '../../GlassCanvas';
import bench from '../../testing.module.css';
import styles from './buttons.module.css';

/**
 * Buttons, after Matt's reference clip: a pill of thick optical glass round a
 * white face, glints of split light on the rim, seated in a groove. Three
 * directions, each drawn by the same WebGL canvas as the locked panes. The
 * light on a rim only turns when the button is pressed, and stops after one
 * turn. Matt chose B; its colored form is on /color. Icons are placeholders until
 * the icon set is designed.
 */
export const metadata: Metadata = {
  title: { absolute: 'Buttons' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1&display=swap';

/** The rim recipe for each direction, read by the canvas. */
const LENS = { 'data-bezel': 8, 'data-body': 0.86, 'data-rim': 0.72, 'data-disp': 0.05 };
const CLEAR = { 'data-bezel': 5, 'data-body': 0.1, 'data-rim': 0.18, 'data-disp': 0.03 };
const THUMB = { 'data-bezel': 6, 'data-body': 0.88, 'data-rim': 0.45, 'data-disp': 0.04 };

export default function ButtonsPage() {
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
          <h1 className={styles.title}>Buttons</h1>
          <p className={styles.sub}>Press one to turn its light.</p>
        </header>

        <section className={styles.option}>
          <h2 className={styles.optName}>
            A. Lens <span>Thick dark rim, white face, split light glints</span>
          </h2>
          <div className={styles.row}>
            <button type="button" className={`${styles.btn} ${styles.lens}`} data-glass="button" {...LENS}>
              <Strategy className={styles.icon} weight="regular" aria-hidden />
              Ask the Swami
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.lens} ${styles.round}`}
              data-glass="button"
              aria-label="Alerts"
              {...LENS}
            >
              <BellSimple className={styles.icon} weight="regular" aria-hidden />
            </button>
          </div>
          <div className={styles.row}>
            <button type="button" className={`${styles.btn} ${styles.lens} ${styles.small}`} data-glass="button" {...LENS}>
              <NewspaperClipping className={styles.iconSm} weight="regular" aria-hidden />
              Read the Rag
            </button>
          </div>
        </section>

        <section className={styles.option}>
          <h2 className={styles.optName}>
            B. Clear <span>The pane glass as a pill, no face, thin rim</span>
          </h2>
          <div className={styles.row}>
            <button type="button" className={`${styles.btn} ${styles.clear}`} data-glass="button" {...CLEAR}>
              <Strategy className={styles.icon} weight="regular" aria-hidden />
              Ask the Swami
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.clear} ${styles.round}`}
              data-glass="button"
              aria-label="Share"
              {...CLEAR}
            >
              <ShareNetwork className={styles.icon} weight="regular" aria-hidden />
            </button>
          </div>
          <div className={styles.row}>
            <button type="button" className={`${styles.btn} ${styles.clear} ${styles.small}`} data-glass="button" {...CLEAR}>
              <UsersThree className={styles.iconSm} weight="regular" aria-hidden />
              Pick your team
            </button>
          </div>
        </section>

        <section className={styles.option}>
          <h2 className={styles.optName}>
            C. Track <span>Seated in a groove, as in the clip</span>
          </h2>
          <div className={styles.track} data-glass="track" role="tablist" aria-label="Sections">
            <button type="button" role="tab" aria-selected className={`${styles.seg} ${styles.thumb}`} data-glass="button" {...THUMB}>
              Matchups
            </button>
            <button type="button" role="tab" aria-selected={false} className={styles.seg}>
              Standings
            </button>
            <button type="button" role="tab" aria-selected={false} className={styles.seg}>
              Rag
            </button>
          </div>
          <div className={`${styles.track} ${styles.slot}`} data-glass="track">
            <button type="button" className={`${styles.btn} ${styles.lens} ${styles.seated}`} data-glass="button" {...LENS}>
              <Strategy className={styles.icon} weight="regular" aria-hidden />
              Ask the Swami
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
