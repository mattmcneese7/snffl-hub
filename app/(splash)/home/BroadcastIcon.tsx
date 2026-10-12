import ic from './icons.module.css';
import d from './thedrop.module.css';

/**
 * The Drop's icon: Phosphor's duotone Broadcast, its one compound path split
 * into its own pieces (the dot, the near waves, the far waves) so the waves
 * can pulse outward while games are live. The geometry is Phosphor's,
 * untouched; only the grouping is ours. Still when nothing is on.
 */
export default function BroadcastIcon({ live, className }: { live: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={`${ic.icon} ${live ? d.onAir : ''} ${className ?? ''}`} fill="currentColor" aria-hidden>
      <path d="M160,128a32,32,0,1,1-32-32A32,32,0,0,1,160,128Z" opacity="0.2" />
      <path d="M128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z" />
      <g className={d.waveNear}>
        <path d="M201.71,159.14a80,80,0,0,1-14.08,22.2,8,8,0,0,1-11.92-10.67,63.95,63.95,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67,80.08,80.08,0,0,1,14.08,84.47Z" />
        <path d="M69,103.09a64,64,0,0,0,11.26,67.58,8,8,0,0,1-11.92,10.67,79.93,79.93,0,0,1,0-106.67A8,8,0,1,1,80.29,85.34,63.77,63.77,0,0,0,69,103.09Z" />
      </g>
      <g className={d.waveFar}>
        <path d="M248,128a119.58,119.58,0,0,1-34.29,84,8,8,0,1,1-11.42-11.2,103.9,103.9,0,0,0,0-145.56A8,8,0,1,1,213.71,44,119.58,119.58,0,0,1,248,128Z" />
        <path d="M53.71,200.78A8,8,0,1,1,42.29,212a119.87,119.87,0,0,1,0-168,8,8,0,1,1,11.42,11.2,103.9,103.9,0,0,0,0,145.56Z" />
      </g>
    </svg>
  );
}
