import type { TrophyKey } from '@/lib/trophy-names';
import { TROPHY_NAMES } from '@/lib/trophy-names';
import { MS } from '../icons';
import m from './modules.module.css';

/** Each award's Material symbol, drawn gold on its gold disc. */
const AWARD_PATH: Record<TrophyKey, string> = {
  motw: MS.crown,
  shart: MS.shart,
  blowout: MS.blowout,
  squeaker: MS.timer,
  heartbreaker: MS.heartBroken,
  lucky: MS.pets,
  bench: MS.couch,
  champion: MS.trophy,
  plunger: MS.plunger,
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

/**
 * Award art: Squirt's photoreal cutouts (transparent PNG or WebP under
 * /public/squirt) as they land. An award with no art yet falls back to its
 * gold icon, drawn to fill the same square slot.
 */
export const AWARD_ART: Partial<Record<TrophyKey, string>> = {};

export function AwardArt({ kind, size = 56, art }: { kind: TrophyKey; size?: number; art?: string }) {
  const src = art ?? AWARD_ART[kind];
  return (
    <span className={m.art} style={{ ['--sz' as string]: `${size}px` }} aria-hidden>
      {src ? <img src={src} alt="" loading="lazy" /> : <AwardIcon kind={kind} size={Math.round(size * 0.72)} />}
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
