import type { Outlook } from '@/lib/outlook';
import { formatStatLine } from '@/lib/sleeper-live';
import type { UsageRow } from '../../../lib/deep/nflverse';
import type { SleeperProp } from '../../../lib/sleeper-props';
import { playerWeek, type WeekLines } from '../../../swami/week-lines';
import r from './read.module.css';

const pct = (n: number | undefined) => (n == null ? null : `${Math.round(n * 100)}%`);
const MATCHUP: Record<'soft' | 'even' | 'hard', string> = { soft: 'Soft matchup', even: 'Even matchup', hard: 'Tough matchup' };

/**
 * A roster row opened up: the read v3 kept under each player on My Team.
 * His week as a box score (done, or projected), the range he could land in,
 * the matchup and role, the book on his game, Sleeper's props and his recent
 * usage. Every block is left out when there is nothing to say.
 */
export default function PlayerRead({
  id,
  name,
  position,
  team,
  outlook,
  role,
  ctx,
  props,
  usage,
}: {
  id: string;
  name: string;
  position: string;
  team: string | null;
  outlook: Outlook;
  role: string | null;
  ctx: WeekLines;
  props: SleeperProp[];
  usage: UsageRow[];
}) {
  const done = formatStatLine(position, ctx.actual[id]?.stats);
  const proj = formatStatLine(position, ctx.projected[id]?.stats, true);
  const pw = playerWeek(ctx, id, position, team ?? undefined);
  const facts = [...pw.book, ...pw.ds];
  const top = Math.max(1, outlook.ceiling * 1.15);
  const at = (n: number) => `${Math.min(100, Math.max(0, (n / top) * 100))}%`;
  const receiver = position === 'WR' || position === 'TE';
  const usageRows = usage.length
    ? [
        { label: 'Snaps', values: usage.map((u) => (u.snapsIn ? pct(u.sp) : null)) },
        ...(position === 'RB' ? [{ label: 'Carries', values: usage.map((u) => pct(u.cs)) }] : []),
        ...(receiver || position === 'RB' ? [{ label: 'Targets', values: usage.map((u) => pct(u.ts)) }] : []),
      ].filter((c) => c.values.some((v) => v != null))
    : [];
  const m = outlook.matchup;
  return (
    <div className={r.read}>
      {done || proj ? (
        <p className={r.line}>
          <small>{done ? 'This week' : 'Projected'}</small>
          <span>{done || proj}</span>
        </p>
      ) : null}

      {outlook.ceiling > 0 ? (
        <div className={r.range} aria-label={`Range this week: ${outlook.floor.toFixed(1)} to ${outlook.ceiling.toFixed(1)}`}>
          <small>Range</small>
          <span className={r.ends}>{outlook.floor.toFixed(1)}</span>
          <span className={r.track} aria-hidden>
            <span className={r.span} style={{ left: at(outlook.floor), width: `calc(${at(outlook.ceiling)} - ${at(outlook.floor)})` }} />
            <span className={r.dot} style={{ left: at(outlook.adjusted) }} />
          </span>
          <span className={r.ends}>{outlook.ceiling.toFixed(1)}</span>
        </div>
      ) : null}

      {m || outlook.boomBust || role ? (
        <div className={r.chips}>
          {m ? (
            <span className={`${r.chip} ${m.label === 'soft' ? r.good : m.label === 'hard' ? r.bad : ''}`}>
              {MATCHUP[m.label]} {m.home ? 'vs' : '@'} {m.opponent}
            </span>
          ) : null}
          {m ? <span className={r.chip}>Defense rank {m.rank}</span> : null}
          {outlook.boomBust ? <span className={r.chip}>Boom {Math.round(outlook.boomBust.boom * 100)}%</span> : null}
          {outlook.boomBust ? <span className={r.chip}>Bust {Math.round(outlook.boomBust.bust * 100)}%</span> : null}
          {role ? <span className={r.chip}>{role}</span> : null}
        </div>
      ) : null}

      {facts.length ? (
        <dl className={r.facts}>
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {props.length ? (
        <div className={r.block}>
          <small>Sleeper Props</small>
          {props.map((p) => (
            <span key={p.wager} className={r.prop}>
              <span>
                {p.label} <b>{p.line}</b>
              </span>
              <span>{[p.over != null ? `Over ${p.over}x` : null, p.under != null ? `Under ${p.under}x` : null].filter(Boolean).join(' · ')}</span>
            </span>
          ))}
        </div>
      ) : null}

      {usageRows.length ? (
        <div className={r.block}>
          <small>Share of Team &middot; Weeks {usage.map((u) => u.week).join(', ')}</small>
          <div className={r.usage} style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${usage.length}, 52px)` }}>
            {usageRows.map((c) => (
              <div key={c.label} className={r.usageRow}>
                <span>{c.label}</span>
                {c.values.map((v, i) => (
                  <b key={i}>{v ?? '–'}</b>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button type="button" data-player={id} className={r.open} aria-label={`${name}, open player`}>
        Player details
      </button>
    </div>
  );
}
