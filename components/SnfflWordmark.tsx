'use client';

import { useEffect, useId, useRef } from 'react';

type SnfflWordmarkProps = {
  className?: string;
  /** Hides the falling drop, for the shrunk header on scroll. */
  compact?: boolean;
  /**
   * Tightens the box to the letters, stripe and stem drips.
   *
   * The full artwork is 300x130, which at header width renders 66px tall and
   * overhangs a 56px header by 10px, painting over the section strip. Cropping
   * keeps the mark at full brand width instead of shrinking it to fit.
   */
  crop?: boolean;
  /** Change this value (for example, the latest score total) to trigger a slosh. */
  sloshKey?: string | number;
  title?: string;
};

const LETTERS =
  'M43.24 66.91Q38.3 66.91 34.04 66.37Q29.78 65.82 26.63 64.45Q23.47 63.08 21.68 60.54Q19.9 58.01 19.9 54.1Q19.9 52.89 20.11 51.56Q20.32 50.23 20.78 48.69H38.96Q38.57 50.1 38.47 50.77Q38.37 51.44 38.37 51.92Q38.37 53.22 39.03 53.9Q39.69 54.57 40.88 54.81Q42.06 55.05 43.55 55.05Q44.63 55.05 45.71 54.82Q46.8 54.58 47.74 54.07Q48.67 53.57 49.22 52.74Q49.76 51.92 49.76 50.75Q49.76 49.59 48.81 48.74Q47.86 47.89 46.22 47.24Q44.58 46.6 42.55 46.01Q40.52 45.41 38.35 44.75Q36.03 44.02 33.71 43.04Q31.4 42.07 29.55 40.65Q27.7 39.23 26.6 37.16Q25.5 35.09 25.5 32.2Q25.5 26.71 27.89 23Q30.27 19.29 34.22 17.02Q38.18 14.75 42.88 13.75Q47.59 12.75 52.23 12.75Q56.75 12.75 60.61 13.42Q64.48 14.1 67.36 15.54Q70.24 16.99 71.84 19.31Q73.45 21.63 73.45 24.93Q73.45 25.64 73.35 26.62Q73.25 27.61 72.63 29.62H54.65Q54.94 28.54 55.04 28Q55.13 27.46 55.13 27.06Q55.13 25.91 54.26 25.2Q53.38 24.5 51.27 24.5Q49.46 24.5 48.19 25.05Q46.93 25.59 46.33 26.46Q45.74 27.34 45.74 28.43Q45.74 29.61 46.52 30.47Q47.3 31.33 48.64 32.03Q49.98 32.72 51.73 33.29Q53.47 33.86 55.4 34.44Q57.87 35.15 60.45 36.07Q63.03 36.99 65.2 38.39Q67.37 39.78 68.7 41.85Q70.03 43.92 70.03 46.87Q70.03 51.56 68.09 55.23Q66.14 58.89 62.54 61.47Q58.95 64.05 54.05 65.43Q49.15 66.81 43.24 66.91ZM73.94 66 85.73 13.71H103.02L110.28 30.9Q110.77 31.97 111.29 33.22Q111.8 34.48 112.28 35.76Q112.76 37.04 113.09 38.2L113.58 38.15Q113.91 36.33 114.41 34.15Q114.91 31.97 115.27 30.21L118.93 13.71H136.82L124.95 66H107.64L99.77 48.09Q99.34 46.62 98.72 44.7Q98.09 42.78 97.59 41.27L97.11 41.29Q96.91 42.86 96.5 44.86Q96.1 46.85 95.71 48.31L91.75 66ZM135.14 66 146.93 13.71H188.49L185.72 25.9H163.32L161.14 35.52H179.65L176.91 47.63H158.4L154.23 66ZM183.33 66 195.13 13.71H236.69L233.92 25.9H211.52L209.34 35.52H227.85L225.11 47.63H206.6L202.43 66ZM231.53 66 243.33 13.71H262.49L253.46 53.52H277.73L274.9 66Z';

const WAVE =
  'M-40 44 Q-30.0 40 -20 44 T0 44 T20 44 T40 44 T60 44 T80 44 T100 44 T120 44 T140 44 T160 44 T180 44 T200 44 T220 44 T240 44 T260 44 T280 44 T300 44 T320 44 T340 44';

/**
 * SNFFL wordmark. Letters use currentColor, so set the text color
 * (ink #141210 in light, #F3EFE6 in dark) on the parent. Animation CSS lives
 * in chrome.css so it is defined once rather than per instance.
 */
export default function SnfflWordmark({
  className,
  compact = false,
  crop = false,
  sloshKey,
  title = 'SNFFL',
}: SnfflWordmarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const water = `snffl-water-${uid}`;
  const clip = `snffl-clip-${uid}`;
  const drop = `snffl-drop-${uid}`;
  const titleId = `snffl-title-${uid}`;
  const tiltRef = useRef<SVGGElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = tiltRef.current;
    if (!el) return;
    el.classList.remove('snffl-slosh');
    void el.getBoundingClientRect();
    el.classList.add('snffl-slosh');
  }, [sloshKey]);

  return (
    <svg
      viewBox={crop ? '0 0 300 96' : '0 0 300 130'}
      role="img"
      aria-labelledby={titleId}
      overflow={crop ? 'hidden' : 'visible'}
      className={[className, compact ? 'snffl-compact' : '', crop ? 'snffl-wordmark-crop' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={water} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9EEFF" />
          <stop offset=".45" stopColor="#5BB6F2" />
          <stop offset="1" stopColor="#1F74C9" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={LETTERS} />
        </clipPath>
        <g id={drop}>
          <path
            d="M0 -9C2.5 -4 6 -1 6 3.5A6 6 0 0 1 -6 3.5C-6 -1 -2.5 -4 0 -9Z"
            fill={`url(#${water})`}
            stroke="#1F74C9"
            strokeWidth={0.7}
          />
          <ellipse cx={-2} cy={3} rx={1.2} ry={1.9} fill="#FFFFFF" opacity={0.85} />
        </g>
      </defs>

      <path d={LETTERS} fill="currentColor" />

      <g clipPath={`url(#${clip})`}>
        <g ref={tiltRef} className="snffl-tilt">
          <g className="snffl-wave">
            <path d={`${WAVE} L340 110 L-40 110 Z`} fill={`url(#${water})`} />
            <path d={WAVE} fill="none" stroke="#FFFFFF" strokeWidth={2} />
          </g>
        </g>
      </g>

      <rect x={24} y={76} width={200} height={7} fill="#E3182D" transform="skewX(-12)" />
      <rect x={236} y={76} width={36} height={7} fill="#E3182D" opacity={0.5} transform="skewX(-12)" />

      <g fill={`url(#${water})`}>
        <path d="M78 62C78 72 76 78 77 84C79 78 82 72 82 62Z" />
        <path d="M131 62C131 76 129 84 130 92C132 84 135 76 135 62Z" />
      </g>
      <use href={`#${drop}`} transform="translate(77.5 91) scale(.9)" />
      <g transform="translate(130.5 99)">
        <g className="snffl-fall">
          <use href={`#${drop}`} />
        </g>
      </g>
    </svg>
  );
}
