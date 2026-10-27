import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import u from './ui.module.css';

/**
 * Splash 4.0's building blocks. Pages compose these and nothing else for
 * spacing, corners, type and surfaces; a page that needs something new adds
 * it here first. Anatomy lives in ui.module.css with the rules it follows.
 */

type Href = { href?: string };
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Wraps its children in a link when given an href, else a plain element. */
function Box({ href, className, children, style, data }: Href & { className: string; children: ReactNode; style?: CSSProperties; data?: Record<string, string> }) {
  const attrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  if (href) {
    return (
      <Link href={href} className={className} style={style} {...attrs}>
        {children}
      </Link>
    );
  }
  return (
    <div className={className} style={style} {...attrs}>
      {children}
    </div>
  );
}

/** A section: its Title Case name, an optional link on the right, then the content. */
export function Section({ title, action, label, children }: { title: string; action?: { href: string; label: string }; label?: string; children: ReactNode }) {
  return (
    <section className={u.section} aria-label={label ?? title}>
      <div className={u.sectionHead}>
        <h2>{title}</h2>
        {action ? <Link href={action.href}>{action.label}</Link> : null}
      </div>
      {children}
    </section>
  );
}

/** One surface, 14 inside. Tappable when it has an href. */
export function Card({ href, children, className }: Href & { children: ReactNode; className?: string }) {
  return (
    <Box href={href} className={cx(u.card, href && u.tap, className)}>
      {children}
    </Box>
  );
}

/** Like items in one card, divided rows. */
export function List({ children, tap = false }: { children: ReactNode; tap?: boolean }) {
  return <div className={cx(u.list, tap && u.tapList)}>{children}</div>;
}

/**
 * One row: an optional lead (avatar, crest, art or rank), a label, the
 * title and a sub line, and on the right a value with its own sub line.
 */
export function Row({
  href,
  lead,
  label,
  title,
  strong,
  sub,
  value,
  valueSub,
  muted,
  data,
  trail,
}: Href & {
  trail?: ReactNode;
  lead?: ReactNode;
  label?: ReactNode;
  title: ReactNode;
  strong?: boolean;
  sub?: ReactNode;
  value?: ReactNode;
  valueSub?: ReactNode;
  muted?: boolean;
  data?: Record<string, string>;
}) {
  return (
    <Box href={href} className={cx(u.row, !lead && u.rowNoLead)} data={data}>
      {lead ?? null}
      <span className={u.body}>
        {label ? <span className={u.label}>{label}</span> : null}
        <span className={cx(u.title, strong && u.strong, muted && u.muted)}>{title}</span>
        {sub ? <span className={u.sub}>{sub}</span> : null}
      </span>
      {trail ? <span className={u.trail}>{trail}</span> : null}
      {!trail && (value != null || valueSub) ? (
        <span className={u.trail}>
          {value != null ? <span className={cx(u.value, muted && u.muted)}>{value}</span> : null}
          {valueSub ? <span className={u.valueSub}>{valueSub}</span> : null}
        </span>
      ) : null}
    </Box>
  );
}

export function Label({ children, tone }: { children: ReactNode; tone?: 'brand' | 'gold' }) {
  return <span className={cx(u.label, tone === 'brand' && u.labelBrand, tone === 'gold' && u.labelGold)}>{children}</span>;
}

/** A manager's face in a ring of their color. 26 in lists, 34 on the hero, 44 on a lead row. */
export function Avatar({ src, color, size = 28 }: { src?: string | null; color?: string | null; size?: 26 | 28 | 34 | 44 }) {
  return (
    <span className={u.avatar} style={{ width: size, height: size, ['--mgr' as string]: color ?? undefined }}>
      {src ? <img src={src} alt="" /> : null}
    </span>
  );
}

/** An NFL club's logo on a white tile, so it reads in both themes. */
export function Crest({ src, size = 28 }: { src?: string | null; size?: 20 | 24 | 28 | 32 | 40 }) {
  return <span className={u.crest} style={{ width: size, height: size }}>{src ? <img src={src} alt="" /> : null}</span>;
}

/**
 * A player: Sleeper's headshot with his club's badge, the way the apps show
 * him. A defense is its club's logo on a white tile instead.
 */
export function Face({ id, team, size = 40, defense = false }: { id: string; team?: string | null; size?: 32 | 40 | 48; defense?: boolean }) {
  const logo = team ? `https://a.espncdn.com/i/teamlogos/nfl/500/${team === 'WAS' ? 'wsh' : team.toLowerCase()}.png` : null;
  if (defense) return <Crest src={logo} size={size === 48 ? 40 : size} />;
  return (
    <span className={u.face} style={{ width: size, height: size }}>
      <img src={`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`} alt="" loading="lazy" />
      {logo ? (
        <span className={u.faceBadge}>
          <img src={logo} alt="" />
        </span>
      ) : null}
    </span>
  );
}

/** Art in a square: Squirt's poses, cutouts. */
export function Art({ src, size = 56 }: { src: string; size?: 40 | 56 | 72 }) {
  return (
    <span className={u.art} style={{ width: size, height: size }}>
      <img src={src} alt="" loading="lazy" />
    </span>
  );
}

/** A seed or rank in the Rag's italic. */
export function Rank({ n }: { n: number | string }) {
  return <span className={u.rank}>{n}</span>;
}

export type HeroSide = { avatar?: string | null; color?: string | null; team: string; manager: string; score: ReactNode; lost?: boolean };

/** The one hero on a screen: your game on brand blue. */
export function Hero({ href, label, state, sides, foot, id }: Href & { label: string; state: ReactNode; sides: HeroSide[]; foot?: ReactNode; id?: string }) {
  const body = (
    <>
      <span className={u.heroTop}>
        <span className={u.label}>{label}</span>
        {state}
      </span>
      {sides.map((x) => (
        <span key={x.team} className={cx(u.heroRow, x.lost && u.heroLost)}>
          <Avatar src={x.avatar} color={x.color} size={34} />
          <span className={u.body}>
            <span className={u.title}>{x.team}</span>
            <span className={u.sub}>{x.manager}</span>
          </span>
          <span className={u.heroScore}>{x.score}</span>
        </span>
      ))}
      {foot ? <span className={u.heroFoot}>{foot}</span> : null}
    </>
  );
  return href ? (
    <Link id={id} href={href} className={cx(u.hero, u.tap)}>
      {body}
    </Link>
  ) : (
    <div id={id} className={u.hero}>
      {body}
    </div>
  );
}

export type RagStory = { href: string; category: string; headline: string };

/**
 * The Rag on a page: the brand blue masthead slab, then the lead (full: the
 * 16:9 art with its category, the headline, the deck; compact: a thumbnail
 * row), then two more stories as rows. One card, corners 20.
 */
export function RagCard({ issueHref, meta, lead, art, deck, readTime, more, compact = false }: { issueHref: string; meta: string; lead: RagStory; art?: string | null; deck?: string; readTime?: number; more: RagStory[]; compact?: boolean }) {
  return (
    <article className={u.rag}>
      <Link href={issueHref} className={u.ragTop}>
        <b>The Rag</b>
        <span className={u.label}>{meta}</span>
      </Link>
      {compact ? (
        <Link href={lead.href} className={cx(u.row, u.ragRow)}>
          {art ? <img className={u.thumb} src={art} alt="" /> : <span />}
          <span className={u.body}>
            <span className={cx(u.label, u.labelBrand)}>{lead.category}</span>
            <span className={cx(u.title, u.strong)}>{lead.headline}</span>
          </span>
        </Link>
      ) : (
        <Link href={lead.href} className={u.ragLead}>
          {art ? <Media src={art} tag={<Tag tone="gold">{lead.category}</Tag>} /> : null}
          <span className={u.ragBody}>
            <span className={u.display}>{lead.headline}</span>
            {deck ? <span className={u.bodyText}>{deck}</span> : null}
            {readTime ? <span className={u.label}>{readTime} min read</span> : null}
          </span>
        </Link>
      )}
      {more.length ? (
        <span className={u.ragMore}>
          {more.map((a) => (
            <Link key={a.href} href={a.href} className={cx(u.row, u.rowNoLead, u.ragRow)}>
              <span className={u.body}>
                <span className={cx(u.label, u.labelBrand)}>{a.category}</span>
                <span className={u.title}>{a.headline}</span>
              </span>
            </Link>
          ))}
        </span>
      ) : null}
    </article>
  );
}

export type PairSide = { lead?: ReactNode; title: ReactNode; sub?: ReactNode; value?: ReactNode; mark?: ReactNode; lost?: boolean };

/**
 * A contest with two sides: a fantasy matchup, an NFL game, a bracket game.
 * Two lines (lead, name and sub, value, mark), a status label on top when it
 * has one, a foot label under. In a List it is one row; `big` sets the value
 * at the hero size for a page that leads with one game.
 */
export function Pair({ href, sides, status, foot, big = false, label, data }: Href & { sides: [PairSide, PairSide]; status?: ReactNode; foot?: ReactNode; big?: boolean; label?: string; data?: Record<string, string> }) {
  const body = (
    <>
      {status ? <span className={u.pairTop}>{status}</span> : null}
      {sides.map((x, i) => (
        <span key={i} className={cx(u.pairSide, x.lost && u.pairLost)}>
          {x.lead ?? <span />}
          <span className={u.body}>
            <span className={cx(u.title, u.strong)}>{x.title}</span>
            {x.sub ? <span className={u.sub}>{x.sub}</span> : null}
          </span>
          <span className={cx(u.value, big && u.valueBig)}>{x.value ?? ''}</span>
          {x.mark !== undefined ? <span className={u.pairMark}>{x.mark}</span> : null}
        </span>
      ))}
      {foot ? <span className={cx(u.label, u.pairFoot)}>{foot}</span> : null}
    </>
  );
  const attrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return href ? (
    <Link href={href} className={cx(u.pair, big && u.pairBig)} aria-label={label} {...attrs}>
      {body}
    </Link>
  ) : (
    <div className={cx(u.pair, big && u.pairBig)} aria-label={label} {...attrs}>
      {body}
    </div>
  );
}

/** Two sides compared line by line: the left value, what it is, the right value. */
export function Versus({ left, right, rows }: { left: ReactNode; right: ReactNode; rows: { label: string; a: ReactNode; b: ReactNode }[] }) {
  return (
    <div className={u.versus}>
      <span className={u.versusRow}>
        <span>{left}</span>
        <span />
        <span className={u.versusEnd}>{right}</span>
      </span>
      {rows.map((r) => (
        <span key={r.label} className={u.versusRow}>
          <span className={u.value}>{r.a}</span>
          <span className={u.label}>{r.label}</span>
          <span className={cx(u.value, u.versusEnd)}>{r.b}</span>
        </span>
      ))}
    </div>
  );
}

/** A share or a chance, 6 tall. */
export function Meter({ pct, label }: { pct: number; label?: string }) {
  return (
    <span className={u.meter} role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <u style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

export function Rail({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={u.rail} role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  );
}

/** A tile in a rail: a head line, then its content, sized to that content. */
export function Tile({ href, head, children, label }: Href & { head: ReactNode; children: ReactNode; label?: string }) {
  const body = (
    <>
      <span className={u.label}>{head}</span>
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={cx(u.tile, u.tap)} aria-label={label}>
      {body}
    </Link>
  ) : (
    <div className={u.tile}>{body}</div>
  );
}

/** One line in a tile: a crest, a short name, a number. */
export function TileRow({ crest, name, value, lost }: { crest?: ReactNode; name: ReactNode; value?: ReactNode; lost?: boolean }) {
  return (
    <span className={cx(u.tileRow, lost && u.tileLost)}>
      {crest ?? <span />}
      <b>{name}</b>
      <span className={u.value}>{value ?? ''}</span>
    </span>
  );
}

/** A still or a clip at 16:9, with a tag on it. */
export function Media({ src, video, tag }: { src: string; video?: boolean; tag?: ReactNode }) {
  return (
    <span className={u.media}>
      {video ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" />}
      {tag ? <span className={u.mediaTag}>{tag}</span> : null}
    </span>
  );
}

export function Pill({ href, kind = 'primary', children, label }: Href & { kind?: 'primary' | 'secondary' | 'white'; children: ReactNode; label?: string }) {
  const cls = cx(u.pill, kind === 'primary' && u.pillPrimary, kind === 'secondary' && u.pillSecondary, kind === 'white' && u.pillWhite);
  return href ? (
    <Link href={href} className={cls} aria-label={label}>
      {children}
    </Link>
  ) : (
    <button type="button" className={cls} aria-label={label}>
      {children}
    </button>
  );
}

export function Chips({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={u.chips} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function Chip({ href, on, children }: Href & { on?: boolean; children: ReactNode }) {
  const cls = cx(u.chip, on && u.chipOn);
  return href ? (
    <Link href={href} className={cls} aria-current={on ? 'page' : undefined}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/** A segmented control: two to four choices, one on. */
export function Seg({ items, label }: { items: { label: string; href: string; on?: boolean }[]; label: string }) {
  return (
    <nav className={u.seg} aria-label={label}>
      {items.map((x) => (
        <Link key={x.href} href={x.href} className={cx(u.segBtn, x.on && u.segOn)} aria-current={x.on ? 'page' : undefined}>
          {x.label}
        </Link>
      ))}
    </nav>
  );
}

export type Tone = 'good' | 'bad' | 'warn' | 'gold' | 'neutral';
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <i className={cx(u.tag, tone === 'good' && u.tagGood, tone === 'bad' && u.tagBad, tone === 'warn' && u.tagWarn, tone === 'gold' && u.tagGold)}>{children}</i>;
}

/** The red Live chip with its pulsing dot. */
export function LiveTag({ text = 'Live' }: { text?: string }) {
  return (
    <i className={cx(u.tag, u.tagLive)}>
      <i aria-hidden />
      {text}
    </i>
  );
}

export function Stats({ items }: { items: { value: ReactNode; label: string }[] }) {
  return (
    <div className={u.stats} style={{ ['--n' as string]: String(items.length) }}>
      {items.map((x) => (
        <span key={x.label} className={u.stat}>
          <b>{x.value}</b>
          <span className={u.label}>{x.label}</span>
        </span>
      ))}
    </div>
  );
}

/** What will appear here, and how to get it. */
export function Empty({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className={u.empty}>
      <p className={u.bodyText}>{children}</p>
      {action ? (
        <Pill href={action.href} kind="secondary">
          {action.label}
        </Pill>
      ) : null}
    </div>
  );
}

export { u as ui };
