/**
 * Drawn triangles.
 *
 * U+25B6, U+25B2 and U+25BC all carry emoji presentation on iOS, so typing
 * them hands the glyph to the system's colour font: a blue play button on a
 * bespoke site, in a shape and colour nothing here chose. Drawing them keeps
 * them ours, takes currentColor, and looks the same on every device.
 */
export function PlayMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 12" aria-hidden focusable="false">
      <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
    </svg>
  );
}

export function UpMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 10" aria-hidden focusable="false">
      <path d="M6 0 L12 10 L0 10 Z" fill="currentColor" />
    </svg>
  );
}

export function DownMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 10" aria-hidden focusable="false">
      <path d="M6 10 L0 0 L12 0 Z" fill="currentColor" />
    </svg>
  );
}
