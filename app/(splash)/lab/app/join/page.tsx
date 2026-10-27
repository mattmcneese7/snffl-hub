import type { Metadata } from 'next';
import { Drop, SWITZER } from '../Chrome';
import { ui } from '../ui';
import { Wallpaper } from '../ui/blocks/Wallpaper';
import f from '../ui/blocks/Frame.module.css';
import j from '../ui/blocks/Join.module.css';
import s from '../v4.module.css';
import Invite from './Invite';

const LINE = 'Live scores, the Rag, every chug and the week in ninety seconds.';

export const metadata: Metadata = {
  title: { absolute: 'Join Splash' },
  description: 'Put Splash on your home screen.',
  robots: { index: false, follow: false },
  // What the card in the group chat says: the instruction, since the image carries the name.
  openGraph: { title: 'Add Splash to your home screen', description: LINE, siteName: 'Splash', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Add Splash to your home screen', description: LINE },
};

/**
 * The invite, the one page people pass around: the home screen icon as it
 * will sit on their phone, the lockup, one line on what it is, then the one
 * step this phone needs and a way to pass it on. v4's frame and kit, without
 * the tab bar, since nobody here is in the app yet.
 */
export default function JoinPage() {
  return (
    <div className={`${s.root} ${f.app}`}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <Wallpaper />
      <main className={f.page}>
        <div className={j.page}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={j.icon} src="/apple-touch-icon.png" alt="The Splash icon" width={96} height={96} />
        <h1 className={`${f.lockup} ${j.lockup}`}>
          <Drop className={f.lockupMark} />
          splash
        </h1>
        <p className={`${ui.bodyText} ${j.line}`}>The Squirtnite FFL, live. {LINE}</p>
          <Invite line={LINE} />
        </div>
      </main>
    </div>
  );
}
