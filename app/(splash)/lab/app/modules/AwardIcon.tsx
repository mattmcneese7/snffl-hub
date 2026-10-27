import type { TrophyKey } from '@/lib/trophy-names';
import { TROPHY_NAMES } from '@/lib/trophy-names';
import { MS } from '../icons';
import { MX } from './icons';
import m from './modules.module.css';

/** Each award's Material symbol, drawn gold on its gold disc. */
const AWARD_PATH: Record<TrophyKey, string> = {
  motw: MX.crown,
  shart: MX.shart,
  blowout: MX.blowout,
  squeaker: MX.timer,
  heartbreaker: MX.heartBroken,
  lucky: MX.pets,
  bench: MX.couch,
  champion: MS.trophy,
  plunger: MX.plunger,
};

/** The award's name, as the trophy case prints it. */
export const AWARD_NAME: Record<TrophyKey, string> = Object.fromEntries(
  Object.entries(TROPHY_NAMES).map(([k, v]) => [k, v.name]),
) as Record<TrophyKey, string>;

/** One award as a gold disc. `size` is the disc in px (36 by default). */
export default function AwardIcon({ kind, size }: { kind: TrophyKey; size?: number }) {
  return (
    <span className={m.award} style={size ? { ['--sz' as string]: `${size}px` } : undefined} aria-hidden>
      <svg viewBox="0 -960 960 960" fill="currentColor">
        <path d={AWARD_PATH[kind]} />
      </svg>
    </span>
  );
}

/** The gold award chip: icon, short name, the week. "MOTW W6". */
export function AwardChip({ kind, label, week }: { kind: TrophyKey; label?: string; week?: number | null }) {
  return (
    <span className={m.chipGold}>
      <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
        <path d={AWARD_PATH[kind]} />
      </svg>
      <b>{label ?? AWARD_NAME[kind]}</b>
      {week ? <span>W{week}</span> : null}
    </span>
  );
}

export { AWARD_PATH };
