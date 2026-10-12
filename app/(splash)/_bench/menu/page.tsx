import type { Metadata } from 'next';
import { MenuDropDock, MenuMarker, MenuMarkerScroll, MenuSplit } from '../../menus';
// The bench's base first, then the ground's tokens over it.
import bench from '../../testing.module.css';
import flow from '../flow/flow.module.css';
import styles from './menu.module.css';

/**
 * Menu attempts, side by side on the app's ground, each kept close to Matt's
 * reference. Tap through them: the pill glides, the icon hops.
 */
export const metadata: Metadata = {
  title: { absolute: 'Menu attempts' },
  robots: { index: false, follow: false },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

const ATTEMPTS = [
  {
    name: 'Chosen: Marker on the scrolling bar',
    note: 'Every section on the white bar, scrolling sideways. The lime highlighter draws under the chosen name, which turns bold and slides to the middle.',
    Menu: MenuMarkerScroll,
  },
  {
    name: '1. Pill',
    note: 'Your reference, faithfully: a white bar, the selection a powder blue pill that stretches as it moves. More sits beside it as a round button.',
    Menu: MenuSplit,
  },
  {
    name: '2. Marker',
    note: 'No bar at all. The section names sit on the page like a masthead, and the brand’s lime highlighter draws itself under the one you choose.',
    Menu: MenuMarker,
  },
  {
    name: '3. Drop dock',
    note: 'A frosted dock at the bottom, icons over names. The chosen tab turns deep blue and the league’s drop hops across to sit under it.',
    Menu: MenuDropDock,
  },
];

export default function MenuPage() {
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
          <h1 className={styles.title}>Menu attempts</h1>
          <p className={styles.sub}>Your pick first, then the three treatments it came from. Tap through them.</p>
        </header>
        {ATTEMPTS.map(({ name, note, Menu }) => (
          <section key={name} className={styles.attempt}>
            <div className={styles.copy}>
              <h2 className={styles.name}>{name}</h2>
              <p className={styles.note}>{note}</p>
            </div>
            <div className={styles.stagePad}>
              <Menu />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
