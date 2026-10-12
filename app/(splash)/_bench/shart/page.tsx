import type { Metadata } from 'next';
import GlassCanvas from '../../GlassCanvas';
import bench from '../../testing.module.css';
import ShartCard from './ShartCard';
import styles from './shart.module.css';

/**
 * Shart of the Week on its own. The card lives in ShartCard.tsx so the composed
 * Home on /testing can use the same one.
 */
export const metadata: Metadata = {
  title: { absolute: 'Shart of the Week' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1&display=swap';

export default function ShartPage() {
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
          <h1 className={styles.title}>Shart of the Week</h1>
          <span className={styles.sub}>The mugshot</span>
        </header>
        <ShartCard />
      </main>
    </div>
  );
}
