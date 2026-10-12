import { BeerStein, Crown } from '@phosphor-icons/react/dist/ssr';
import styles from './soul.module.css';

/**
 * Squirt: the league's drop, with the face the old logo had, brought back as a
 * character rather than the mark. The mark (A1) stays plain; Squirt is the
 * personality, and reacts to the week:
 *
 *   smug    your side is well ahead, or won
 *   sweat   it is close and still being played
 *   gloom   your side is well behind, or lost
 *   calm    nothing on the line yet
 *   sleep   nothing is happening at all (nobody has traded)
 *
 * And a prop, from the icon set rather than drawn: a crown for whoever is
 * top of the table, a stein when somebody owes a chug.
 *
 * Drawn in Pool: a powder body, a deep blue line, the laces faint down the
 * front.
 */
export type Mood = 'smug' | 'sweat' | 'gloom' | 'calm' | 'sleep';
export type Prop = 'crown' | 'stein';

const BODY = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

export default function Squirt({ mood, size = 64, prop }: { mood: Mood; size?: number; prop?: Prop }) {
  return (
    <span className={`${styles.squirt} ${styles[mood]}`} style={{ width: size, height: size, fontSize: size }} aria-hidden>
      <svg viewBox="0 0 64 64" className={styles.squirtSvg}>
        {/* Body */}
        <path d={BODY} className={styles.body} />
        {/* Laces, faint, down the front */}
        <g className={styles.laces}>
          <path d="M32 44 V 57" />
          <path d="M29 47 H 35 M29 50.5 H 35 M29 54 H 35" />
        </g>

        {/* Eyes */}
        {mood === 'sleep' ? (
          <>
            <path d="M20 37 Q 24.5 40.4 29 37" className={styles.line} />
            <path d="M35 37 Q 39.5 40.4 44 37" className={styles.line} />
          </>
        ) : (
          <>
            <ellipse cx="24.5" cy="36" rx="5" ry="5.6" className={styles.eye} />
            <ellipse cx="39.5" cy="36" rx="5" ry="5.6" className={styles.eye} />
          </>
        )}
        {mood === 'sleep' ? null : mood === 'gloom' ? (
          <>
            <circle cx="24.5" cy="38.4" r="2.2" className={styles.pupil} />
            <circle cx="39.5" cy="38.4" r="2.2" className={styles.pupil} />
          </>
        ) : mood === 'sweat' ? (
          <>
            <circle cx="25.2" cy="35.4" r="1.9" className={styles.pupil} />
            <circle cx="40.2" cy="35.4" r="1.9" className={styles.pupil} />
          </>
        ) : (
          <>
            <circle cx="25.6" cy="36.6" r="2.3" className={styles.pupil} />
            <circle cx="40.6" cy="36.6" r="2.3" className={styles.pupil} />
          </>
        )}

        {/* Lids and brows set the mood */}
        {mood === 'smug' ? (
          <>
            <path d="M19.4 34.6 Q 24.5 31.4 29.6 34.6 L 29.6 30 L 19.4 30 Z" className={styles.lid} />
            <path d="M34.4 34.6 Q 39.5 31.4 44.6 34.6 L 44.6 30 L 34.4 30 Z" className={styles.lid} />
            <path d="M20 28.6 Q 24.5 26.6 29 28.2" className={styles.line} />
            <path d="M35 27.2 Q 39.8 24.6 44.4 26.6" className={styles.line} />
          </>
        ) : null}
        {mood === 'sweat' ? (
          <>
            <path d="M20 29.4 Q 24 27 28.6 28.8" className={styles.line} />
            <path d="M35.4 28.8 Q 40 27 44 29.4" className={styles.line} />
          </>
        ) : null}
        {mood === 'gloom' ? (
          <>
            <path d="M19.4 33 Q 24.5 31 29.6 33 L 29.6 30 L 19.4 30 Z" className={styles.lid} />
            <path d="M34.4 33 Q 39.5 31 44.6 33 L 44.6 30 L 34.4 30 Z" className={styles.lid} />
            <path d="M20.4 30.6 Q 24 28.6 28.6 27.6" className={styles.line} />
            <path d="M35.4 27.6 Q 40 28.6 43.6 30.6" className={styles.line} />
          </>
        ) : null}

        {/* Mouth */}
        {mood === 'smug' ? <path d="M27 44.6 Q 32.5 47.6 37.6 43.2" className={styles.line} /> : null}
        {mood === 'calm' ? <path d="M28 44.4 Q 32 47 36 44.4" className={styles.line} /> : null}
        {mood === 'sweat' ? <path d="M27.6 45.4 Q 29.6 44 31.6 45.4 Q 33.6 46.8 35.6 45.4 Q 37 44.4 37.6 45" className={styles.line} /> : null}
        {mood === 'gloom' ? <path d="M27.6 46.4 Q 32 43.4 36.4 46.4" className={styles.line} /> : null}
        {mood === 'sleep' ? <ellipse cx="32" cy="45.6" rx="1.8" ry="1.4" className={styles.line} /> : null}

        {/* Sweat: a bead that runs down the side */}
        {mood === 'sweat' ? (
          <path d="M48 26 C 49.4 28.4 50.6 29.8 50.6 31.4 A 2.6 2.6 0 0 1 45.4 31.4 C 45.4 29.8 46.6 28.4 48 26 Z" className={styles.bead} />
        ) : null}
      </svg>
      {mood === 'sleep' ? (
        <span className={styles.zzz} aria-hidden>
          <span>z</span>
          <span>z</span>
        </span>
      ) : null}
      {prop === 'crown' ? <Crown weight="duotone" className={styles.crown} aria-hidden /> : null}
      {prop === 'stein' ? <BeerStein weight="duotone" className={styles.stein} aria-hidden /> : null}
    </span>
  );
}
