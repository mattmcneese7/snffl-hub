import type { Metadata } from 'next';
import Icon, { ICON_NAMES } from '../../home/Icons';
import bench from '../../testing.module.css';
import styles from './icons.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Icon set' },
  robots: { index: false, follow: false },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

/** The whole Splash icon set, in its three dresses: on a disc, in the
 * menu at rest, and in the menu chosen. */
export default function IconsPage() {
  return (
    <div className={`${bench.stage} ${styles.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <main className={styles.page}>
        <h1 className={styles.title}>The icon set</h1>
        <p className={styles.note}>{ICON_NAMES.length} icons, one 24px grid, a white face and a deep blue line.</p>
        <ul className={styles.grid}>
          {ICON_NAMES.map((name) => (
            <li key={name} className={styles.cell}>
              <span className={styles.disc}>
                <Icon name={name} />
              </span>
              <span className={styles.pair}>
                <Icon name={name} className={styles.rest} />
                <Icon name={name} className={styles.on} />
              </span>
              <span className={styles.name}>{name}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
