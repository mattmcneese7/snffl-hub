import type { TrophyKey } from '@/lib/trophy-names';
import { TROPHY_NAMES } from '@/lib/trophy-names';
import { MS } from '../icons';
import { Art, Tag, type Tone } from '../ui';

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

/** One award's symbol on a tag, neutral unless this is the screen's one gold. `size` is the symbol in px. */
export default function AwardIcon({ kind, size = 14, tone = 'neutral' }: { kind: TrophyKey; size?: number; tone?: Tone }) {
  return (
    <span aria-hidden>
      <Tag tone={tone}>
        <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor">
          <path d={AWARD_PATH[kind]} />
        </svg>
      </Tag>
    </span>
  );
}

/**
 * Award art: Squirt's photoreal cutouts (transparent PNG or WebP under
 * /public/squirt) as they land. An award with no art yet falls back to its
 * gold icon, drawn to fill the same square slot.
 */
/** Squirt's award poses, cut out of the studio background (public/squirt). */
export const AWARD_ART: Partial<Record<TrophyKey, string>> = {
  motw: '/squirt/crown-480.webp',
  champion: '/squirt/trophy-480.webp',
  shart: '/squirt/shart-480.webp',
  blowout: '/squirt/blowout-480.webp',
  squeaker: '/squirt/squeaker-480.webp',
  heartbreaker: '/squirt/heartbreaker-480.webp',
  lucky: '/squirt/lucky-480.webp',
  bench: '/squirt/bench-480.webp',
  plunger: '/squirt/plunger-480.webp',
};

export function AwardArt({ kind, size = 56, art }: { kind: TrophyKey; size?: number; art?: string }) {
  const src = art ?? AWARD_ART[kind];
  const sq = size <= 40 ? 40 : size <= 56 ? 56 : 72;
  return src ? <Art src={src} size={sq} /> : <AwardIcon kind={kind} size={Math.round(sq * 0.4)} />;
}

/** An award chip: symbol, short name, the week. "MOTW W6". Neutral unless it is the screen's one gold. */
export function AwardChip({ kind, label, week, tone = 'neutral' }: { kind: TrophyKey; label?: string; week?: number | null; tone?: Tone }) {
  return (
    <Tag tone={tone}>
      <svg viewBox="0 -960 960 960" width={13} height={13} fill="currentColor" aria-hidden>
        <path d={AWARD_PATH[kind]} />
      </svg>
      {label ?? AWARD_NAME[kind]}
      {week ? ` W${week}` : ''}
    </Tag>
  );
}

export { AWARD_PATH };
