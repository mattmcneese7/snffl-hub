import type { ReactNode } from 'react';
import Link from 'next/link';
import type { MatchupRead, Outlook } from '@/lib/outlook';
import { TEAM_LOGO } from '@/lib/sleeper';
import { nflNickname } from './nflTeams';
import type { SleeperProp } from '../lib/sleeper-props';
import type { UsageRow } from '../lib/deep/nflverse';
import type { PlayerWeek } from '../swami/week-lines';
import WeekFacts from '../swami/WeekFacts';
import w from '../home/widgets.module.css';
import r from './playerrow.module.css';

/**
 * One player, the same everywhere a list of players appears (the Swami, My
 * Team, a manager's roster). Collapsed, only what every row needs, at one
 * height: the slot if there is one, his face, his name, a line on who he is,
 * a line on his week, and the number. The caret opens everything else: the
 * week in words, the books, DraftSharks, Sleeper's props, his usage, his
 * range, and the way to his page.
 */
export default function PlayerRow({
  id,
  name,
  headshot,
  slot,
  meta,
  sub,
  value,
  projected = false,
  note,
  children,
}: {
  id: string;
  name: string;
  headshot: string | null;
  /** The roster slot, "QB", "FLEX", "BN", "IR". */
  slot?: string;
  /** Who he is: position, logo, team. */
  meta: ReactNode;
  /** His week, in a few words: "at New England Patriots", "Bye week". */
  sub?: ReactNode;
  /** The number on the right. */
  value: string;
  /** The number is a projection or a placeholder, not points scored: drawn quieter. */
  projected?: boolean;
  /** A small line under the number, "Proj: 15.49" before he has played. */
  note?: string;
  /** The deep read, shown when the row is opened. */
  children?: ReactNode;
}) {
  const quiet = slot === 'BN' || slot === 'IR' || slot === 'TAXI';
  return (
    <details className={r.item}>
      <summary className={`${r.row} ${slot ? r.withSlot : ''}`}>
        {slot ? <span className={`${r.slot} ${quiet ? r.slotQuiet : ''}`}>{slot}</span> : null}
        <span className={r.face}>
          {headshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headshot} alt="" loading="lazy" />
          ) : null}
        </span>
        <span className={r.who}>
          <span className={r.name}>{name}</span>
          <span className={r.meta}>{meta}</span>
          {sub ? <span className={r.meta}>{sub}</span> : null}
        </span>
        <span className={r.end}>
          <span className={r.nums}>
            <span className={`${r.num} ${projected ? r.numProj : ''}`}>{value}</span>
            {note ? <span className={r.note}>{note}</span> : null}
          </span>
          <span className={r.chev} aria-hidden />
        </span>
      </summary>
      <div className={`${r.detail} ${slot ? r.detailSlot : ''}`}>
        {children}
        <Link href={`/players/${id}`} className={r.go}>
          Player page
        </Link>
      </div>
    </details>
  );
}

const pts = (n: number) => n.toFixed(2);

/**
 * Line one, the same on every row: his position, then his club, as its logo
 * and its name alone ("QB | Raiders"). Always the position, even when the
 * slot says it, because a FLEX could be any of three. Short enough that no
 * row ever trails off. A defense's name is its club, so it says only that it
 * is one.
 */
export function PlayerMeta({ position, team }: { position: string; team?: string | null }) {
  if (position === 'DEF') return <>Defense</>;
  return (
    <>
      <b className={r.pos}>{position}</b>
      <span className={r.sep}>|</span>
      {team ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TEAM_LOGO(team)} alt="" />
          <span>{nflNickname(team)}</span>
        </>
      ) : (
        <span>No NFL team</span>
      )}
    </>
  );
}

/**
 * Points he has actually scored this week, or null. Null until his NFL game
 * has kicked off (and on a bye): Sleeper carries every rostered player at 0
 * until he plays, and a 0 before kickoff is not a score. Rows show the
 * projection instead.
 */
export function scoredThisWeek(gameState: 'pre' | 'in' | 'post' | null | undefined, ...sources: (number | null | undefined)[]): number | null {
  if (gameState !== 'in' && gameState !== 'post') return null;
  for (const v of sources) if (v != null) return v;
  return null;
}

/** Line two, the same on every row: who he plays this week, "at Patriots". */
export function weekLine(m: Pick<MatchupRead, 'home' | 'opponent'> | null, team?: string | null): string {
  if (!team) return 'Free agent';
  return m ? `${m.home ? 'vs' : 'at'} ${nflNickname(m.opponent)}` : 'No game this week';
}
const pct = (n: number | undefined) => (n == null ? null : `${Math.round(n * 100)}%`);

/** The matchup in one chip: soft, even or hard. */
export function MatchupChip({ m }: { m: MatchupRead | null }) {
  if (!m) return null;
  const tone = m.label === 'soft' ? '' : m.label === 'hard' ? w.chipHot : r.chipEven;
  return <span className={`${w.chip} ${tone}`}>Matchup | {m.label.charAt(0).toUpperCase() + m.label.slice(1)}</span>;
}

/**
 * The deep read under a row. Every part shows only when it has something
 * real: his week in words and the books (WeekFacts), his range this week,
 * the matchup and its odds, Sleeper's props, and the last three weeks of
 * usage from nflverse.
 */
export function PlayerDeep({
  outlook,
  role,
  pw,
  props = [],
  usage = [],
  position,
  scaleTop,
}: {
  outlook: Outlook | null;
  role: string | null;
  pw: PlayerWeek | null;
  props?: SleeperProp[];
  usage?: UsageRow[];
  position: string;
  /** One scale for every range in a list, so they compare down it. */
  scaleTop?: number;
}) {
  const top = Math.max(1, scaleTop ?? (outlook ? outlook.ceiling * 1.15 : 1));
  const at = (n: number) => `${Math.min(100, Math.max(0, (n / top) * 100))}%`;
  const receiver = position === 'WR' || position === 'TE';
  const usageCells = usage.length
    ? [
        { label: 'Snap share', values: usage.map((u) => (u.snapsIn ? pct(u.sp) : null)) },
        ...(position === 'RB' ? [{ label: 'Carry share', values: usage.map((u) => pct(u.cs)) }] : []),
        ...(receiver || position === 'RB' ? [{ label: 'Target share', values: usage.map((u) => pct(u.ts)) }] : []),
        ...(receiver ? [{ label: 'Targets', values: usage.map((u) => (u.tgt != null ? String(u.tgt) : null)) }] : []),
      ].filter((c) => c.values.some((v) => v != null))
    : [];

  return (
    <>
      {pw ? <WeekFacts pw={pw} /> : null}

      {outlook && outlook.ceiling > 0 ? (
        <span className={r.range} aria-label={`Range this week: ${pts(outlook.floor)} to ${pts(outlook.ceiling)}`}>
          <span>{pts(outlook.floor)}</span>
          <span className={r.track} aria-hidden>
            <span className={r.span} style={{ left: at(outlook.floor), width: `calc(${at(outlook.ceiling)} - ${at(outlook.floor)})` }} />
            <span className={r.dot} style={{ left: at(outlook.adjusted) }} />
          </span>
          <span>{pts(outlook.ceiling)}</span>
        </span>
      ) : null}

      {outlook?.matchup || outlook?.boomBust || role ? (
        <span className={r.tags}>
          <MatchupChip m={outlook?.matchup ?? null} />
          {outlook?.matchup ? <span className={`${w.chip} ${r.chipEven}`}>Defense rank | {outlook.matchup.rank}</span> : null}
          {outlook?.boomBust ? (
            <>
              <span className={w.chip}>Boom chance | {Math.round(outlook.boomBust.boom * 100)}%</span>
              <span className={`${w.chip} ${r.chipEven}`}>Bust chance | {Math.round(outlook.boomBust.bust * 100)}%</span>
            </>
          ) : null}
          {role ? <span className={`${w.chip} ${r.chipEven}`}>Role | {role}</span> : null}
        </span>
      ) : null}

      {props.length ? (
        <span className={r.block}>
          <span className={r.label}>Sleeper props</span>
          <span className={r.list}>
            {props.map((p) => (
              <span key={p.wager} className={r.prop}>
                <span>
                  {p.label} | <b>{p.line}</b>
                </span>
                <span className={r.pay}>
                  {[p.over != null ? `Over ${p.over}x` : null, p.under != null ? `Under ${p.under}x` : null].filter(Boolean).join(', ')}
                </span>
              </span>
            ))}
          </span>
        </span>
      ) : null}

      {usageCells.length ? (
        <span className={r.block}>
          <span className={r.label}>Usage | Weeks {usage.map((u) => u.week).join(', ')}</span>
          <span className={r.usage}>
            {usageCells.map((c) => (
              <span key={c.label} className={r.usageRow}>
                <span>{c.label}</span>
                {c.values.map((v, i) => (
                  <b key={i}>{v ?? 'Pending'}</b>
                ))}
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </>
  );
}
