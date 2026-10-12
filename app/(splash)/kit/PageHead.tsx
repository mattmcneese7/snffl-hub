import type { ReactNode } from 'react';
import CollapseAll from './CollapseAll';
import k from './kit.module.css';

/**
 * A section page's head, on the wallpaper above its widgets: the name at
 * 34/900 on the 28px text line (the menu above already shows the section's
 * icon, marked), an optional line under it, and an optional control (a week
 * picker, a filter) below. The Home has no head; every other page opens with
 * this.
 */
export default function PageHead({
  title,
  sub,
  children,
  collapse = false,
}: {
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
  /** A Collapse all control beside the title, for long pages of widgets. */
  collapse?: boolean;
}) {
  return (
    <header className={k.head}>
      {collapse ? (
        <div className={k.titleRow}>
          <h1 className={k.title}>{title}</h1>
          <CollapseAll />
        </div>
      ) : (
        <h1 className={k.title}>{title}</h1>
      )}
      {sub ? <p className={k.sub}>{sub}</p> : null}
      {children}
    </header>
  );
}
