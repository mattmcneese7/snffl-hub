import type { ReactNode } from 'react';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import Icon, { type IconName } from './Icons';
import w from './widgets.module.css';

/**
 * A widget: one white card on the wallpaper, in one of three sizes on the
 * home's two column grid, the way a phone home screen works.
 *
 *   s  a square, one column: one fact
 *   m  both columns, as tall as it needs: a short list
 *   l  both columns, the big stories
 *
 * Every widget opens the same way: its icon from the set, its name, and the
 * way further in. The icon is the section's mark everywhere it appears.
 */
export function WidgetHead({
  icon,
  title,
  href,
  more,
  extra,
  aside,
}: {
  icon?: IconName;
  title: ReactNode;
  href?: string;
  more?: string;
  /** Something small that belongs with the title, after it. */
  extra?: ReactNode;
  /** A state on the right, in place of the way further in. */
  aside?: ReactNode;
}) {
  return (
    <div className={w.head}>
      {icon ? <Icon name={icon} className={w.headIcon} /> : null}
      <span className={w.title}>{title}</span>
      {extra}
      {aside ? <span className={w.aside}>{aside}</span> : null}
      {!aside && href && more ? (
        <Link href={href} className={w.more}>
          {more}
          <CaretRight weight="bold" className={w.caret} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export default function Widget({
  size,
  icon,
  title,
  href,
  more,
  className,
  children,
}: {
  size: 's' | 'm' | 'l';
  icon?: IconName;
  title?: ReactNode;
  href?: string;
  more?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${w.widget} ${w[size]} ${className ?? ''}`}>
      {title ? <WidgetHead icon={icon} title={title} href={href} more={more} /> : null}
      {children}
    </section>
  );
}
