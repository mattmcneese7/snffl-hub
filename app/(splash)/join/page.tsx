import type { Metadata } from 'next';
import AppIcon from '../home/AppIcon';
import Pattern from '../home/Pattern';
import bench from '../testing.module.css';
import Invite from './Invite';
import styles from './join.module.css';

const LINE = 'Live scores, the Rag, every chug and the week in ninety seconds.';

export const metadata: Metadata = {
  title: { absolute: 'Join Splash' },
  description: 'Put Splash on your home screen.',
  robots: { index: false, follow: false },
  // What the card in the group chat says: the instruction, since the image
  // already carries the name.
  openGraph: { title: 'Add Splash to your home screen', description: LINE, siteName: 'Splash', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Add Splash to your home screen', description: LINE },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

/**
 * The invite, in Splash: the link Matt sends the league. The app icon as
 * it will sit on their home screen, the name, one line on what it is, then
 * the one step this phone needs, and a way to pass it on. The v3
 * counterpart of /join, which stays as it is until v3 ships.
 */
export default function JoinPage() {
  return (
    <div className={`${bench.stage} ${styles.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      {/* The app's own wallpaper behind the invite, so it looks like Splash
          from the first tap. */}
      <Pattern mode="wallpaper" />
      <main className={styles.page}>
        <div className={styles.icon}>
          <AppIcon variant="paper" size={112} />
        </div>
        <h1 className={styles.name}>Splash</h1>
        <p className={styles.line}>The Squirtnite FFL, live. {LINE}</p>
        <Invite line={LINE} />
      </main>
    </div>
  );
}
