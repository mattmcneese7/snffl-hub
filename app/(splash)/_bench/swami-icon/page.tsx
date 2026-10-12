import type { Metadata } from 'next';
import { Binoculars, Flask, MagicWand } from '@phosphor-icons/react/dist/ssr';
import bench from '../../testing.module.css';
import styles from './swami-icon.module.css';

export const metadata: Metadata = { title: { absolute: 'The Swami icon' }, robots: { index: false, follow: false } };

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

/** game-icons.net "Magic lamp" by Lorc, CC BY 3.0: needs a credit if used. */
const LAMP = 'M203.72 87.938c-2.082.017-4.18.31-6.282.874-13.45 3.608-21.412 17.53-17.782 31.094 1.384 5.172 4.235 9.52 8 12.75-31.85 15.446-53.498 45.172-59.28 78.72l-22.532 7.593c-11.235-2.877-21.416-4.2-30.53-4.095-14.696.167-26.65 4.02-35.908 10.97-18.518 13.896-23.316 38.02-19.53 60.655 3.784 22.636 15.81 45.127 34.343 59.344 18.532 14.216 44.715 18.96 71.03 4.875 4.43-2.373 8.776-4.81 12.813-6.97 2.993 10.772 14.018 17.16 24.75 14.28 10.253-2.75 16.547-12.963 14.656-23.31 16.984 10.05 34.495 15.674 52.186 17.405-14.094 20.893-32.316 39.57-53.97 54.78 27.754 27.726 224.764-24.853 229.626-61.592-26.89-2.484-52.525-9.935-75.562-21.563 67.995-43.983 128.655-133.27 160.656-234.563l-42.47 14.344c-44.11 67.313-122.214 103.81-167.155 28a107.922 107.922 0 0 0-53-9.593c1.656-4.69 1.95-9.913.564-15.093-3.063-11.443-13.392-18.998-24.625-18.906zM76.062 233.53c5.11-.027 10.865.51 17.312 1.75 18.656 36.728 39.31 63.938 61.188 82.845-.767.113-1.546.263-2.313.47-.146.038-.293.08-.438.124-2.846.324-5.588 1.044-8.218 1.936-9.64 3.27-18.73 9.084-27.156 13.594-20.655 11.056-36.95 7.41-50.844-3.25-13.895-10.66-24.256-29.5-27.28-47.594-3.027-18.094.948-34.097 12.31-42.625 5.683-4.263 13.943-7.186 25.438-7.25z';

function GenieLamp() {
  return (
    <svg viewBox="0 0 512 512" className={styles.solid}>
      <path d={LAMP} />
    </svg>
  );
}
function CrystalBall() {
  return (
    <svg viewBox="0 0 24 24" className={styles.stroke}>
      <path d="M6.73 17.018a8 8 0 1 1 10.54 0" />
      <path d="M5 19a2 2 0 0 0 2 2h10a2 2 0 1 0 0 -4h-10a2 2 0 0 0 -2 2z" className={styles.face} />
      <path d="M11 7a3 3 0 0 0 -3 3" />
    </svg>
  );
}
function GenieBottle() {
  return (
    <svg viewBox="0 0 24 24" className={styles.stroke}>
      <path d="M14 3.5c0 1.626 .507 3.212 1.45 4.537l.05 .07a8.093 8.093 0 0 1 1.5 4.694v6.199a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-6.2c0 -1.682 .524 -3.322 1.5 -4.693l.05 -.07a7.823 7.823 0 0 0 1.45 -4.537" className={styles.face} />
      <path d="M10 5h4v-2a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v2z" className={styles.face} />
      <path d="M7 14.803a2.4 2.4 0 0 0 1 -.803a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 1 -.805" />
    </svg>
  );
}

const OPTIONS = [
  { name: 'Genie lamp', from: 'game-icons.net (credit required)', note: 'The real thing: an oil lamp with a spout. A solid silhouette, so it reads heavier than the rest of the set.', Icon: GenieLamp },
  { name: 'Genie bottle', from: 'Tabler (MIT)', note: 'A bottle with a cork and liquid inside. Reads as a bottle first, genie second.', Icon: GenieBottle },
  { name: 'Crystal ball', from: 'Tabler (MIT)', note: 'A fortune teller’s ball on a stand. The clearest “sees the future” icon.', Icon: CrystalBall },
  { name: 'Magic wand', from: 'Phosphor, our set', note: 'Already in our set, so it matches exactly. Magic, but not a genie.', Icon: () => <MagicWand weight="duotone" className={styles.ph} /> },
  { name: 'Flask', from: 'Phosphor, our set', note: 'Matches exactly. Reads as a lab flask more than a genie bottle.', Icon: () => <Flask weight="duotone" className={styles.ph} /> },
  { name: 'Binoculars (now)', from: 'Phosphor, our set', note: 'What the Swami uses today: scouting, not magic.', Icon: () => <Binoculars weight="duotone" className={styles.ph} /> },
];

/** The Swami's icon, six ways, each in the menu (at rest and chosen) and on a disc. */
export default function SwamiIconPage() {
  return (
    <div className={`${bench.stage} ${styles.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <main className={styles.page}>
        <h1 className={styles.h1}>The Swami&rsquo;s icon</h1>
        {OPTIONS.map(({ name, from, note, Icon }) => (
          <section key={name} className={styles.card}>
            <div className={styles.row}>
              <span className={styles.disc}>
                <Icon />
              </span>
              <span className={styles.menu}>
                <span className={styles.rest}>
                  <Icon />
                  The Swami
                </span>
                <span className={styles.on}>
                  <Icon />
                  The Swami
                </span>
              </span>
            </div>
            <div className={styles.text}>
              <b>{name}</b>
              <span className={styles.from}>{from}</span>
              <span>{note}</span>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
