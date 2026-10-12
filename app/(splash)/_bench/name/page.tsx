import type { Metadata } from 'next';
import { Fragment } from 'react';
import { MarkDropRefined } from '../../marks';
import bench from '../../testing.module.css';
import styles from './name.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Name options' },
  robots: { index: false, follow: false },
};

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/**
 * The app's name, eight ways, each set the way it would actually live: in
 * the top bar beside the mark, as a home screen icon with its label, and at
 * the head of a push notification. Built only from what the league already
 * is: Squirtnite FFL on Sleeper, its initials SNFFL, v2's SQUIRT, The
 * SquirtRag, Squirt himself, the drop and the chug.
 */
type Option = {
  name: string;
  /** What iOS prints under the icon, when it differs from the name. */
  label?: string;
  roots: string;
  why: string;
  cost: string;
};

const OPTIONS: Option[] = [
  {
    name: 'Squirtnite',
    roots: 'The league, exactly as Sleeper names it.',
    why: 'Nothing to explain to anyone in the league, and it is already on every Rag issue.',
    cost: 'The casual “nite” spelling reads as the joke it is, not as a product.',
  },
  {
    name: 'Squirt',
    roots: 'What v2 calls itself, and the character.',
    why: 'Short, fits any home screen, and Squirt the character becomes the brand, the way an owl is Duolingo.',
    cost: 'On its own, to anyone outside the league, it is only the joke.',
  },
  {
    name: 'The Squirt',
    roots: 'Squirt, framed as a publication.',
    why: 'Reads like a sports media brand (The Athletic, The Ringer), keeps the word, and The SquirtRag becomes its paper.',
    cost: 'The “The” makes the icon label long and can feel formal for a group chat.',
  },
  {
    name: 'SNFFL',
    roots: 'The league initials, Squirtnite FFL.',
    why: 'NFL sits inside it, so it reads like a real league. The most professional option, and still pure insider.',
    cost: 'Hard to say out loud, and no personality on its own; Squirt has to carry all of it.',
  },
  {
    name: 'Squirt Sports',
    roots: 'Squirt, framed as a network.',
    why: 'The brief asked for Barstool energy with broadcast polish; this is that shape, and it keeps the word.',
    cost: 'Two words, so the icon label truncates.',
    label: 'Squirt Spor…',
  },
  {
    name: 'The Drop',
    roots: 'The mark is a drop, the Rag drops on Tuesday, teams drop 150.',
    why: 'A clean media name that says the mark out loud and works as a verb all season.',
    cost: 'Loses the word squirt entirely, so the history lives only in the mark and Squirt.',
  },
  {
    name: 'Nightcap',
    roots: 'The “nite” in Squirtnite, and the chug: a nightcap is the last drink.',
    why: 'The most grown up of the set, warm, and it quietly nods to both halves of the league.',
    cost: 'The furthest from squirt; without the drop and Squirt nobody would connect it.',
  },
  {
    name: 'Splash',
    roots: 'The drop, and a splash play.',
    why: 'Sporty, wet like the mark, and easy to say.',
    cost: 'Generic: it could be any app, and it drops the league’s own words.',
  },
];

/** The name in the wordmark's type, each i dotted with a deep blue drop. */
function Wordmark({ name }: { name: string }) {
  return (
    <span className={styles.wordmark} aria-label={name}>
      <span aria-hidden>
        {[...name].map((ch, i) =>
          ch === 'i' ? (
            <span key={i} className={styles.i}>
              {'ı'}
              <svg viewBox="0 0 64 64" className={styles.tittle}>
                <path d={DROP} />
              </svg>
            </span>
          ) : (
            <Fragment key={i}>{ch}</Fragment>
          ),
        )}
      </span>
    </span>
  );
}

export default function NamePage() {
  return (
    <div className={`${bench.stage} ${styles.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <main className={styles.page}>
        <header className={styles.intro}>
          <h1 className={styles.h1}>The name</h1>
          <p className={styles.lede}>
            Eight names, each built from what the league already is. Each one is set in the top bar, as an icon on a home
            screen, and at the head of a notification, so you can judge it where it would live.
          </p>
        </header>

        {OPTIONS.map((o, n) => (
          <section key={o.name} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.num}>{n + 1}</span>
              <span className={styles.roots}>{o.roots}</span>
            </div>

            {/* The top bar, as it is on the Home. */}
            <div className={styles.topbar}>
              <span className={styles.brand}>
                <span className={styles.mark}>
                  <MarkDropRefined />
                </span>
                <Wordmark name={o.name} />
              </span>
              <span className={styles.week}>
                <svg viewBox="0 0 64 64" className={styles.weekDrop} aria-hidden>
                  <path d={DROP} />
                </svg>
                Week 5
              </span>
            </div>

            <div className={styles.contexts}>
              {/* The home screen icon and its label. */}
              <div className={styles.homeScreen}>
                <span className={styles.icon}>
                  <MarkDropRefined />
                </span>
                <span className={styles.iconLabel}>{o.label ?? o.name}</span>
              </div>

              {/* A push notification, the way the watcher sends them. */}
              <div className={styles.push}>
                <span className={styles.pushIcon}>
                  <MarkDropRefined />
                </span>
                <span className={styles.pushText}>
                  <b>{o.name}</b>
                  <span>Matt, you&rsquo;re down 56.2 with 1 to play.</span>
                </span>
                <span className={styles.pushTime}>now</span>
              </div>
            </div>

            <dl className={styles.notes}>
              <dt>Why it works</dt>
              <dd>{o.why}</dd>
              <dt>What it costs</dt>
              <dd>{o.cost}</dd>
            </dl>
          </section>
        ))}
      </main>
    </div>
  );
}
