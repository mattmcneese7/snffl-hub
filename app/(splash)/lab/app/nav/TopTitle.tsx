'use client';

import { useEffect, useState } from 'react';
import { Ms, type MsName } from '../icons';
import s from '../ui/blocks/Frame.module.css';

/**
 * The top bar's title: the page's branded wordmark, small, faded in only
 * once the large one under the bar has scrolled away, the way iOS large
 * titles collapse into the bar.
 */
export default function TopTitle({ icon, word }: { icon?: MsName; word: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // The large title can stream in a moment after the bar; look for it for
    // a second before deciding the page has none.
    let io: IntersectionObserver | null = null;
    let tries = 0;
    let raf = 0;
    const find = () => {
      const big = document.getElementById('pageTitle');
      if (big) {
        io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < 52), { rootMargin: '-52px 0px 0px 0px' });
        io.observe(big);
      } else if (tries++ < 60) raf = requestAnimationFrame(find);
      else setShown(true);
    };
    find();
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, []);
  return (
    <span className={s.topTitle} data-shown={shown} aria-hidden={!shown}>
      {icon ? <Ms name={icon} size={16} /> : null}
      {word}
    </span>
  );
}
