import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import Pattern from '../../home/Pattern';
import { Ms, type MsName } from './icons';
import { Drop, SWITZER, TabBar, type Back } from './Chrome';
import s from './v4.module.css';
import k from './skeleton.module.css';


/**
 * The frame while a page loads: the same paper, head, score bar slot and tab
 * bar as the Shell, so nothing moves when the page arrives. Only the parts
 * that wait on data (the week, your avatar, the bar's scores, the content)
 * are placeholders. Error and not-found pages use it too, without the bar.
 */
export function Frame({
  active,
  icon,
  word,
  back,
  bar = true,
  children,
}: {
  active: string;
  /** A Material name from icons.tsx, or a drawn icon. Leave out for Home, which shows the lockup. */
  icon?: MsName | ReactNode;
  word?: string;
  back?: Back;
  bar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={s.root}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <Pattern mode="wallpaper" />
      <main className={s.page} aria-busy={bar ? true : undefined}>
        <div className={s.head}>
          {icon && word ? (
            <h1 className={s.secHead}>
              {typeof icon === 'string' ? <Ms name={icon as MsName} /> : icon}
              {word}
            </h1>
          ) : (
            <Link href="/lab/app" className={s.lockup} aria-label="splash, home">
              <Drop className={s.lockupMark} />
              splash
            </Link>
          )}
          <span className={s.headR}>
            <i className={k.bone} style={{ width: 52, height: 14 }} />
            <span className={s.acct} aria-hidden />
          </span>
        </div>
        {back ? (
          <Link href={back.href} className={s.back}>
            &lsaquo; {back.label}
          </Link>
        ) : null}
        {children}
      </main>
      <div className={s.dock}>
        {bar ? <div className={`${s.bar} ${k.bar}`} aria-hidden /> : null}
        <TabBar active={active} />
      </div>
    </div>
  );
}

/** A section title: the bar of its words, and a link's width if it has one. */
export function SkTitle({ w = 120, link = false }: { w?: number; link?: boolean }) {
  return (
    <div className={s.title} aria-hidden>
      <i className={k.bone} style={{ width: w, height: 18 }} />
      {link ? <i className={k.bone} style={{ width: 64, height: 13 }} /> : null}
    </div>
  );
}

/** A card of a fixed height, optionally in brand blue (your game, the hero). */
export function SkCard({ h, blue = false, style }: { h: number; blue?: boolean; style?: CSSProperties }) {
  return <div className={`${k.card} ${blue ? k.blue : ''}`} style={{ height: h, ...style }} aria-hidden />;
}

/** A list card of rows: avatar or headshot, two lines, and a number on the right. */
export function SkList({ rows, h = 56, round = true }: { rows: number; h?: number; round?: boolean }) {
  return (
    <div className={s.list} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={k.row} style={{ height: h }}>
          <i className={k.bone} style={{ width: 28, height: 28, borderRadius: round ? '50%' : 8 }} />
          <span className={k.lines}>
            <i className={k.bone} style={{ width: `${62 - (i % 3) * 9}%`, height: 14 }} />
            <i className={k.bone} style={{ width: `${38 - (i % 2) * 8}%`, height: 11 }} />
          </span>
          <i className={k.bone} style={{ width: 44, height: 16 }} />
        </div>
      ))}
    </div>
  );
}

/** A row of chips, the way the League links and the week picker sit. */
export function SkChips({ n, w = 72, rows = 1 }: { n: number; w?: number; rows?: number }) {
  return (
    <div className={k.chips} aria-hidden style={{ maxHeight: rows * 38 - 6 }}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={`${k.bone} ${k.chip}`} style={{ width: w + ((i * 13) % 24) }} />
      ))}
    </div>
  );
}

/** A side scrolling rail of tiles (hardware, film, stories). */
export function SkRail({ n = 3, w = 150, h = 170, round = false }: { n?: number; w?: number; h?: number; round?: boolean }) {
  return (
    <div className={k.rail} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={`${k.bone} ${k.tile}`} style={{ width: w, height: h, borderRadius: round ? '50%' : 20 }} />
      ))}
    </div>
  );
}

/** Screen reader line for the loading state. */
export function SkStatus({ what }: { what: string }) {
  return (
    <p className={k.sr} role="status">
      Loading {what}
    </p>
  );
}
