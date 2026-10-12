import type { TrophyKey } from '@/components/Trophy';
import Icon, { type IconName } from './Icons';
import styles from './home.module.css';

/**
 * The league's hardware in the icon set: each award's icon on a powder disc,
 * a white face and a deep blue line. One disc, one stroke, one grid, so a
 * row of them reads as a set.
 */
const AWARD_ICON: Record<TrophyKey, IconName> = {
  motw: 'crown',
  shart: 'toiletPaper',
  blowout: 'bomb',
  squeaker: 'timer',
  heartbreaker: 'heartBreak',
  lucky: 'dog',
  bench: 'couch',
  champion: 'trophy',
  plunger: 'toilet',
};

export default function AwardIcon({ kind, size }: { kind: TrophyKey; size?: number }) {
  // Sized up for the trophy case: the disc grows and the icon keeps its
  // share of it, about two thirds.
  const style = size ? { width: size, height: size } : undefined;
  const inner = size ? { width: Math.round(size * 0.64), height: Math.round(size * 0.64) } : undefined;
  return (
    <span className={styles.award} style={style} aria-hidden>
      <Icon name={AWARD_ICON[kind]} style={inner} />
    </span>
  );
}

export { AWARD_ICON };
