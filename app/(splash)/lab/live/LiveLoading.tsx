'use client';

import { usePathname } from 'next/navigation';
import { SkeletonCard } from '../kit/Skeleton';
import w from '../../home/widgets.module.css';
import HeroBug from './HeroBug';
import { heldFor } from './stash';

/**
 * Loading, for the board and the gamecast. On the way into a gamecast the
 * card just tapped is drawn as the real score bug straight away (the numbers
 * the board was showing), so the card can morph into it; everything below is
 * a skeleton until the page lands.
 */
export default function LiveLoading() {
  const path = usePathname() ?? '';
  const id = Number(path.match(/^\/lab\/live\/(\d+)/)?.[1]);
  const held = Number.isInteger(id) ? heldFor(id) : null;
  if (held) {
    return (
      <div className={w.grid}>
        <HeroBug game={held} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={4} />
      </div>
    );
  }
  return (
    <div className={w.grid}>
      <SkeletonCard rows={1} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
      <SkeletonCard rows={2} />
    </div>
  );
}
