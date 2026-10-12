import type { Metadata } from 'next';
import Link from 'next/link';
import AppIcon, { type IconVariant } from '../../home/AppIcon';
import bench from '../../testing.module.css';
import styles from './identity.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Splash identity' },
  robots: { index: false, follow: false },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

const ICONS: { v: IconVariant; name: string; note: string }[] = [
  { v: 'pool', name: 'Pool', note: 'A white drop landing in powder ripples on deep blue. The name, drawn, and the boldest on a home screen.' },
  { v: 'powder', name: 'Powder', note: 'A deep blue drop in white ripples on powder. Softer, closest to the app inside.' },
  { v: 'paper', name: 'Paper', note: 'The ink drop on paper, the mark exactly as the top bar shows it. The quietest.' },
];

/**
 * The identity bench: the app icon three ways, each at the sizes it is
 * actually seen (a home screen, the install prompt, a browser tab), and the
 * ways in to the intro and the Rag's nameplates on the Home.
 */
export default function IdentityPage() {
  return (
    <div className={`${bench.stage} ${styles.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <main className={styles.page}>
        <header className={styles.intro}>
          <h1 className={styles.h1}>Splash, the identity</h1>
          <p className={styles.lede}>
            The app icon three ways, each where it is really seen. The live site&rsquo;s icon is untouched; the winner
            replaces it when v3 ships.
          </p>
        </header>

        {ICONS.map((icon) => (
          <section key={icon.v} className={styles.card}>
            <div className={styles.cardHead}>
              <b>{icon.name}</b>
              <span>{icon.note}</span>
            </div>

            {/* A home screen row: the icon among plain neighbors. */}
            <div className={styles.homeScreen}>
              <span className={styles.app}>
                <span className={styles.blank} />
                <span className={styles.label}>&nbsp;</span>
              </span>
              <span className={styles.app}>
                <AppIcon variant={icon.v} size={60} />
                <span className={styles.label}>Splash</span>
              </span>
              <span className={styles.app}>
                <span className={styles.blank} />
                <span className={styles.label}>&nbsp;</span>
              </span>
              <span className={styles.app}>
                <span className={styles.blank} />
                <span className={styles.label}>&nbsp;</span>
              </span>
            </div>

            <div className={styles.sizes}>
              <span className={styles.size}>
                <AppIcon variant={icon.v} size={120} />
                <span>Install, 120</span>
              </span>
              <span className={styles.size}>
                <AppIcon variant={icon.v} size={40} />
                <span>Notification, 40</span>
              </span>
              {/* A browser tab: the favicon at its true 16px, beside the title. */}
              <span className={styles.size}>
                <span className={styles.tab}>
                  <AppIcon variant={icon.v} size={16} round={false} />
                  <span>Splash</span>
                </span>
                <span>Tab, 16</span>
              </span>
            </div>
          </section>
        ))}

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <b>The intro and the Rag&rsquo;s nameplate</b>
            <span>Both live on the Home. Replay the intro, or switch the nameplate.</span>
          </div>
          <div className={styles.links}>
            <Link href="/?intro=1" className={styles.link}>
              Replay the intro
            </Link>
            <Link href="/?mast=tabloid" className={styles.link}>
              Tabloid nameplate
            </Link>
            <Link href="/?mast=broadsheet" className={styles.link}>
              Broadsheet nameplate
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
