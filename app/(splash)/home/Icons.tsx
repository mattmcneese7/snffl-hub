import type { ComponentType, CSSProperties } from 'react';
import {
  ArrowsLeftRight,
  BeerBottle,
  BeerStein,
  Bell,
  Binoculars,
  Bomb,
  BookOpenText,
  CalendarDots,
  Coins,
  Confetti,
  Couch,
  Crown,
  Dog,
  DotsThreeCircle,
  Drop,
  Fire,
  FlagPennant,
  Football,
  FootballHelmet,
  Gavel,
  Gear,
  HandPointing,
  HeartBreak,
  House,
  Megaphone,
  Newspaper,
  PlayCircle,
  Popcorn,
  Ranking,
  Siren,
  Strategy,
  Television,
  Timer,
  Toilet,
  ToiletPaper,
  TrafficCone,
  Trophy,
  TShirt,
  User,
  ChartBar,
  ClipboardText,
  ClockCounterClockwise,
  DeviceMobile,
  Gauge,
  Percent,
  TrendUp,
  UserPlus,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import ic from './icons.module.css';

type GlyphProps = { weight?: string; size?: number; className?: string; style?: CSSProperties; 'aria-hidden'?: boolean };

/**
 * The Swami's genie lamp, Matt's pick. Phosphor has no genie, so this is
 * "Magic lamp" by Lorc from game-icons.net (CC BY 3.0, credited on the More
 * page). It is one solid silhouette, so it takes the line color whole.
 */
const LAMP = 'M203.72 87.938c-2.082.017-4.18.31-6.282.874-13.45 3.608-21.412 17.53-17.782 31.094 1.384 5.172 4.235 9.52 8 12.75-31.85 15.446-53.498 45.172-59.28 78.72l-22.532 7.593c-11.235-2.877-21.416-4.2-30.53-4.095-14.696.167-26.65 4.02-35.908 10.97-18.518 13.896-23.316 38.02-19.53 60.655 3.784 22.636 15.81 45.127 34.343 59.344 18.532 14.216 44.715 18.96 71.03 4.875 4.43-2.373 8.776-4.81 12.813-6.97 2.993 10.772 14.018 17.16 24.75 14.28 10.253-2.75 16.547-12.963 14.656-23.31 16.984 10.05 34.495 15.674 52.186 17.405-14.094 20.893-32.316 39.57-53.97 54.78 27.754 27.726 224.764-24.853 229.626-61.592-26.89-2.484-52.525-9.935-75.562-21.563 67.995-43.983 128.655-133.27 160.656-234.563l-42.47 14.344c-44.11 67.313-122.214 103.81-167.155 28a107.922 107.922 0 0 0-53-9.593c1.656-4.69 1.95-9.913.564-15.093-3.063-11.443-13.392-18.998-24.625-18.906zM76.062 233.53c5.11-.027 10.865.51 17.312 1.75 18.656 36.728 39.31 63.938 61.188 82.845-.767.113-1.546.263-2.313.47-.146.038-.293.08-.438.124-2.846.324-5.588 1.044-8.218 1.936-9.64 3.27-18.73 9.084-27.156 13.594-20.655 11.056-36.95 7.41-50.844-3.25-13.895-10.66-24.256-29.5-27.28-47.594-3.027-18.094.948-34.097 12.31-42.625 5.683-4.263 13.943-7.186 25.438-7.25z';
function GenieLamp({ size, className, style, 'aria-hidden': hidden }: GlyphProps) {
  return (
    <svg viewBox="0 0 512 512" width={size ?? '1em'} height={size ?? '1em'} className={className} style={style} aria-hidden={hidden} fill="currentColor">
      <path d={LAMP} />
    </svg>
  );
}

/**
 * The Splash icon set. The drawings are Phosphor's duotone set, drawn by
 * people who draw icons for a living, so every shape is accurate and every
 * stroke matches. What makes them ours is the dress: the duotone's back
 * layer becomes a solid face, and both tones come from custom properties.
 *
 *   --ic-face  the face, the filled layer   (default white)
 *   --ic-line  the line                     (default deep blue)
 *
 * The menu runs them in ink on white, then powder and deep blue when chosen;
 * the awards sit them on a powder disc; the background presses them into the
 * paper.
 */
const SET = {
  // The game
  football: Football,
  helmet: FootballHelmet,
  playbook: Strategy,
  flag: FlagPennant,
  jersey: TShirt,
  foamFinger: HandPointing,
  cone: TrafficCone,
  timer: Timer,
  tv: Television,
  popcorn: Popcorn,
  // The league
  drop: Drop,
  stein: BeerStein,
  bottle: BeerBottle,
  toiletPaper: ToiletPaper,
  toilet: Toilet,
  trophy: Trophy,
  crown: Crown,
  bomb: Bomb,
  heartBreak: HeartBreak,
  dog: Dog,
  couch: Couch,
  fire: Fire,
  siren: Siren,
  gavel: Gavel,
  megaphone: Megaphone,
  confetti: Confetti,
  // Sections and tools
  house: House,
  ranking: Ranking,
  newspaper: Newspaper,
  binoculars: Binoculars,
  genie: GenieLamp,
  play: PlayCircle,
  more: DotsThreeCircle,
  calendar: CalendarDots,
  coins: Coins,
  bell: Bell,
  gear: Gear,
  swap: ArrowsLeftRight,
  book: BookOpenText,
  person: User,
  // Added in the fine-comb pass, so every widget's icon says what it holds.
  phone: DeviceMobile,
  percent: Percent,
  chart: ChartBar,
  trending: TrendUp,
  pickup: UserPlus,
  gauge: Gauge,
  clipboard: ClipboardText,
  history: ClockCounterClockwise,
} satisfies Record<string, PhIcon | ComponentType<GlyphProps>>;

export type IconName = keyof typeof SET;
export const ICON_NAMES = Object.keys(SET) as IconName[];

/** The drawing at 24px, for use inside another svg (the background tiles). */
export function Glyph({ name }: { name: IconName }) {
  const P = SET[name];
  return <P weight="duotone" size={24} className={ic.icon} />;
}

/** One icon. Size and color come from the class it is given. */
export default function Icon({ name, className, style }: { name: IconName; className?: string; style?: CSSProperties }) {
  const P = SET[name];
  return <P weight="duotone" className={`${ic.icon} ${className ?? ''}`} style={style} aria-hidden />;
}
