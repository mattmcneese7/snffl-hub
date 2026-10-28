import p from './Pos.module.css';

/** A player's position on its own pastel (QB, RB, WR, TE, K, DEF). */
export function Pos({ position }: { position?: string | null }) {
  if (!position) return null;
  return <i className={`${p.pos} ${p[position] ?? ''}`}>{position}</i>;
}
