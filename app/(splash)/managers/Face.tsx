import m from './managers.module.css';

/**
 * A round face on a powder tint: a manager's Sleeper avatar or a player's
 * headshot. With no picture, the manager's initials stand in, in deep blue on
 * the same powder, so the circle is never empty.
 */
export default function Face({ src, size = 40, initials, ring = false }: { src?: string | null; size?: number; initials?: string; ring?: boolean }) {
  return (
    <span className={`${m.face} ${ring ? m.faceRing : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span>{initials ?? ''}</span>
      )}
    </span>
  );
}

export const initialsOf = (name: string) => name.trim().slice(0, 2).toUpperCase();
