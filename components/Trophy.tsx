/**
 * The league's hardware. Each award has its own drawn mark on a medallion, so
 * a trophy reads at a glance at 18px beside a team name and holds up at 72px
 * in a trophy case.
 *
 * Fills are fixed brand colors written as hex, not CSS variables: Brief
 * Section 4 rule 6 keeps variables out of SVG presentation attributes. The
 * medallion's own dark ring keeps each mark legible on both themes.
 */

import type { TrophyKey } from '@/lib/trophies';
export type { TrophyKey };

export const TROPHIES: Record<TrophyKey, { name: string; blurb: string }> = {
  motw: { name: 'Manager of the Week', blurb: 'Highest score of the week' },
  shart: { name: 'The Shart', blurb: 'Lowest score of the week. Owes a chug.' },
  blowout: { name: 'Blowout', blurb: 'Biggest margin of victory' },
  squeaker: { name: 'Squeaker', blurb: 'Narrowest win of the week' },
  heartbreaker: { name: 'Heartbreaker', blurb: 'Highest score in a loss' },
  lucky: { name: 'Lucky Dog', blurb: 'Lowest score in a win' },
  bench: { name: 'Bench Rot', blurb: 'Most points left on the bench' },
  champion: { name: 'Champion', blurb: 'Won the whole thing' },
  plunger: { name: 'The Golden Plunger', blurb: 'Lost the Shart Bowl. Last place.' },
};

/** Medallion colors per award: outer ring, inner field top and bottom. */
const MEDAL: Record<TrophyKey, [string, string, string]> = {
  motw: ['#7a5a12', '#fff2c2', '#f0c24b'],
  shart: ['#4a2c16', '#f3dcc2', '#c99a6b'],
  blowout: ['#6b1414', '#ffd9c7', '#ff7a45'],
  squeaker: ['#243553', '#e3eefb', '#9cc3ee'],
  heartbreaker: ['#5c1030', '#ffe0ea', '#ff8fb0'],
  lucky: ['#12492e', '#dcf7e6', '#6fd29b'],
  bench: ['#3b3326', '#eee6d6', '#b9a888'],
  champion: ['#5e4508', '#fff4cc', '#e8b52e'],
  plunger: ['#5e4508', '#fdf0c4', '#d9a520'],
};

function Mark({ kind }: { kind: TrophyKey }) {
  switch (kind) {
    case 'motw':
      // A gold cup, pouring water the way the wordmark drips.
      return (
        <g>
          <path d="M20 17h24v6c0 9-5 15-12 15s-12-6-12-15z" fill="#e3a51c" stroke="#7a5a12" strokeWidth="1.6" />
          <path d="M20 20h-4c0 6 3 9 6 9M44 20h4c0 6-3 9-6 9" fill="none" stroke="#7a5a12" strokeWidth="2" />
          <rect x="29" y="38" width="6" height="6" fill="#c98a12" />
          <rect x="23" y="44" width="18" height="4" rx="1.5" fill="#7a5a12" />
          <path d="M24 19h7" stroke="#fff6d6" strokeWidth="2" strokeLinecap="round" />
          <path d="M45 18c3 3 4 7 3 11" fill="none" stroke="#1f74c9" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="47.5" cy="33" r="2" fill="#5bb6f2" />
        </g>
      );
    case 'shart':
      // The poop emoji, with feelings.
      return (
        <g>
          <path d="M32 12c2 3 1 6-2 7 6 0 9 3 8 7 6 0 10 4 9 9 5 1 7 5 6 9-1 5-6 7-12 7H22c-7 0-11-3-11-8 0-4 3-7 7-8-1-5 3-9 9-9-1-4 2-7 7-7-1-3 0-6-2-7z" fill="#8a5a2b" stroke="#4a2c16" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M22 31c4 1 10 1 16-1M17 41c6 2 18 2 30-1" fill="none" stroke="#5e3a1b" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="26" cy="37" r="3.4" fill="#ffffff" />
          <circle cx="38" cy="37" r="3.4" fill="#ffffff" />
          <circle cx="27" cy="37.6" r="1.6" fill="#1a1a1a" />
          <circle cx="37" cy="37.6" r="1.6" fill="#1a1a1a" />
          <path d="M26 45c3 3 9 3 12 0" fill="none" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 20c-2-2 0-4-2-6M50 18c2-2 0-4 2-6" fill="none" stroke="#6b8f3a" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="52" cy="24" r="1.6" fill="#1a1a1a" />
          <path d="M50.5 22.5l-1.5-1.5M53.5 22.5l1.5-1.5" stroke="#9aa4b2" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    case 'blowout':
      // A lit bomb.
      return (
        <g>
          <circle cx="29" cy="37" r="12" fill="#2b2b33" stroke="#111111" strokeWidth="1.6" />
          <path d="M23 31a8 8 0 0 1 6-3" fill="none" stroke="#6d6d7a" strokeWidth="2" strokeLinecap="round" />
          <rect x="35" y="21" width="6" height="6" rx="1" transform="rotate(40 38 24)" fill="#4a4a55" />
          <path d="M40 21c2-4 5-5 8-4" fill="none" stroke="#b85f10" strokeWidth="2" strokeLinecap="round" />
          <path d="M48 17l3-4M49 19l5-1M47 15l0-5M50 16l4-3" stroke="#ff7a1a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48.5" cy="17" r="2.4" fill="#ffd23f" />
        </g>
      );
    case 'squeaker':
      // A mouse, squeaking by.
      return (
        <g>
          <circle cx="22" cy="24" r="7" fill="#9aa4b2" stroke="#4a5568" strokeWidth="1.4" />
          <circle cx="42" cy="24" r="7" fill="#9aa4b2" stroke="#4a5568" strokeWidth="1.4" />
          <circle cx="22" cy="24" r="3.6" fill="#f5b8c8" />
          <circle cx="42" cy="24" r="3.6" fill="#f5b8c8" />
          <path d="M32 24c9 0 14 7 14 14 0 7-6 11-14 11s-14-4-14-11c0-7 5-14 14-14z" fill="#b8c1cc" stroke="#4a5568" strokeWidth="1.6" />
          <circle cx="27" cy="36" r="2" fill="#1a1a1a" />
          <circle cx="37" cy="36" r="2" fill="#1a1a1a" />
          <circle cx="32" cy="42" r="2.4" fill="#e3718f" />
          <path d="M24 43l-8-1M24 45l-8 2M40 43l8-1M40 45l8 2" stroke="#4a5568" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      );
    case 'heartbreaker':
      return (
        <g>
          <path d="M32 50C18 40 13 33 13 26c0-6 4-10 10-10 4 0 7 2 9 5 2-3 5-5 9-5 6 0 10 4 10 10 0 7-5 14-19 24z" fill="#e3183d" stroke="#5c1030" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M32 21l-4 8 6 5-5 7 3 9" fill="none" stroke="#ffe0ea" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M20 22c-2 1-3 3-3 5" fill="none" stroke="#ff9db4" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'lucky':
      // A horseshoe, the right way up so the luck stays in.
      return (
        <g>
          <path d="M18 16c0 16 4 30 14 30s14-14 14-30" fill="none" stroke="#6d7684" strokeWidth="8" strokeLinecap="round" />
          <path d="M18 16c0 16 4 30 14 30s14-14 14-30" fill="none" stroke="#c9d1de" strokeWidth="3" strokeLinecap="round" />
          <circle cx="19" cy="24" r="1.4" fill="#2b2f36" />
          <circle cx="21" cy="34" r="1.4" fill="#2b2f36" />
          <circle cx="45" cy="24" r="1.4" fill="#2b2f36" />
          <circle cx="43" cy="34" r="1.4" fill="#2b2f36" />
          <path d="M28 14l2-4 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3z" fill="#ffd23f" stroke="#b8860b" strokeWidth="1" />
        </g>
      );
    case 'bench':
      // A bench with cobwebs: points left to rot.
      return (
        <g>
          <rect x="12" y="30" width="40" height="6" rx="1.5" fill="#8a6b43" stroke="#4a3a24" strokeWidth="1.4" />
          <rect x="12" y="20" width="40" height="6" rx="1.5" fill="#9c7a4d" stroke="#4a3a24" strokeWidth="1.4" />
          <path d="M16 36v12M48 36v12M16 26v4M48 26v4" stroke="#4a3a24" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12 20l8 8M12 26l5-6M12 20c3 1 5 3 6 6" fill="none" stroke="#dfe6ee" strokeWidth="1" />
          <circle cx="36" cy="27" r="2.6" fill="#1a1a1a" />
          <path d="M36 20v4.4M33 25l-2-2M39 25l2-2M33 28l-2 2M39 28l2 2" stroke="#1a1a1a" strokeWidth="1" strokeLinecap="round" />
        </g>
      );
    case 'champion':
      return (
        <g>
          <path d="M14 42l-2-22 11 9 9-15 9 15 11-9-2 22z" fill="#e8b52e" stroke="#5e4508" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="14" y="42" width="36" height="6" rx="1.5" fill="#c9971c" stroke="#5e4508" strokeWidth="1.6" />
          <circle cx="32" cy="35" r="3.2" fill="#e3182d" />
          <circle cx="22" cy="37" r="2.2" fill="#1f74c9" />
          <circle cx="42" cy="37" r="2.2" fill="#1f74c9" />
          <circle cx="12" cy="20" r="2" fill="#fff4cc" />
          <circle cx="32" cy="14" r="2" fill="#fff4cc" />
          <circle cx="52" cy="20" r="2" fill="#fff4cc" />
        </g>
      );
    case 'plunger':
      // The golden plunger, the season's last chug in trophy form.
      return (
        <g>
          <rect x="30" y="10" width="4" height="26" rx="2" fill="#d9a520" stroke="#5e4508" strokeWidth="1.2" />
          <path d="M18 46c0-8 6-12 14-12s14 4 14 12z" fill="#e8b52e" stroke="#5e4508" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="16" y="45" width="32" height="4" rx="2" fill="#c9971c" stroke="#5e4508" strokeWidth="1.4" />
          <path d="M24 40c2-2 5-3 8-3" fill="none" stroke="#fff4cc" strokeWidth="2" strokeLinecap="round" />
          <path d="M46 16l2-3M49 20l3-1M44 13l0-3" stroke="#e8b52e" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
  }
}

export default function Trophy({
  kind,
  size = 64,
  title,
}: {
  kind: TrophyKey;
  size?: number;
  /** Accessible name; defaults to the award's name. */
  title?: string;
}) {
  const [ring, top, bottom] = MEDAL[kind];
  const id = `snffl-medal-${kind}`;
  return (
    <svg
      className="snffl-trophy-art"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title ?? TROPHIES[kind].name}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={ring} />
      <circle cx="32" cy="32" r="27" fill={`url(#${id})`} />
      <path d="M12 22a22 22 0 0 1 40 0" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      <Mark kind={kind} />
    </svg>
  );
}
