/**
 * Squirt, drawn rather than photographed.
 *
 * The mark shipped as a 768 pixel render of a football textured droplet with
 * lit eyes, and that render is the brand: it stays on the splash and anywhere
 * it is shown big. But a photograph is the wrong thing to put in a 64 pixel
 * button. It carried texture nobody can see at that size, it could not be
 * recoloured or stroked, the eyes could not be lit independently of the body,
 * and an animation could only cross fade to it rather than land on it.
 *
 * So this is the flat reading of the same mark: the droplet, the laces, the
 * glare. Three groups, each addressable, which is what makes it animatable.
 * It is deliberately not a trace of the render, because tracing a photoreal
 * image gives a thousand points describing its noise.
 *
 * Ids are namespaced per instance: two of these on one page with the same
 * gradient id would have the second quietly steal the first's paint.
 */
export default function SquirtMark({
  size = 64,
  glow = true,
  id = 'squirt',
  className,
}: {
  size?: number;
  /** The eyes light. Off where the mark is small enough that it smears. */
  glow?: boolean;
  /** Unique per instance when more than one is on the page. */
  id?: string;
  className?: string;
}) {
  const body = `${id}-body`;
  const lit = `${id}-lit`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Squirt"
    >
      <defs>
        <linearGradient id={body} x1="18" y1="6" x2="46" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c3dced" />
        </linearGradient>
        {glow ? (
          <filter id={lit} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>

      {/* The drop. */}
      <path
        d="M32 3 C 40 14, 54 29, 54 39 A 22 22 0 1 1 10 39 C 10 29, 24 14, 32 3 Z"
        fill={`url(#${body})`}
      />

      {/* The laces, kept narrow so they clear the eyes. */}
      <g stroke="#8ba0b6" strokeWidth="2.4" strokeLinecap="round" opacity="0.55">
        <path d="M32 22 V 52" />
        <path d="M28 28 H 36" />
        <path d="M28 35 H 36" />
        <path d="M28 42 H 36" />
        <path d="M28 49 H 36" />
      </g>

      {/* The glare, angled out and up, which is the whole character of him. */}
      <g fill="#0fb8ff" filter={glow ? `url(#${lit})` : undefined}>
        <path d="M13 40 C 15 33, 21 30, 26.5 34 C 23.5 38.5, 18.5 41, 13 40 Z" />
        <path d="M51 40 C 49 33, 43 30, 37.5 34 C 40.5 38.5, 45.5 41, 51 40 Z" />
      </g>
    </svg>
  );
}
