import type { Outlook } from '@/lib/outlook';
import { formatStatLine } from '@/lib/sleeper-live';
import type { UsageRow } from '../../../lib/deep/nflverse';
import type { SleeperProp } from '../../../lib/sleeper-props';
import { playerWeek, type WeekLines } from '../../../swami/week-lines';
import { Tag, ui } from '../ui';
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
        <p className={r.block}>
          <span className={ui.label}>{done ? 'This week' : 'Projected'}</span>
          <span className={`${ui.sub} ${ui.strong}`}>{done || proj}</span>
        </p>
      ) : null}

      {outlook.ceiling > 0 ? (
        <div className={r.range} aria-label={`Range this week: ${outlook.floor.toFixed(1)} to ${outlook.ceiling.toFixed(1)}`}>
          <span className={ui.label}>Range</span>
          <span className={ui.sub}>{outlook.floor.toFixed(1)}</span>
          <span className={ui.range} aria-hidden>
            <span className={ui.rangeBand} style={{ left: at(outlook.floor), width: `calc(${at(outlook.ceiling)} - ${at(outlook.floor)})` }} />
            <span className={`${ui.rangeDot} ${ui.rangeHit}`} style={{ left: at(outlook.adjusted) }} />
          </span>
          <span className={ui.sub}>{outlook.ceiling.toFixed(1)}</span>
        </div>
      ) : null}

      {m || outlook.boomBust || role ? (
        <div className={r.tags}>
          {m ? (
            <Tag tone={m.label === 'soft' ? 'good' : m.label === 'hard' ? 'bad' : 'neutral'}>
              {MATCHUP[m.label]} {m.home ? 'vs' : '@'} {m.opponent}
            </Tag>
          ) : null}
          {m ? <Tag>Defense rank {m.rank}</Tag> : null}
          {outlook.boomBust ? <Tag>Boom {Math.round(outlook.boomBust.boom * 100)}%</Tag> : null}
          {outlook.boomBust ? <Tag>Bust {Math.round(outlook.boomBust.bust * 100)}%</Tag> : null}
          {role ? <Tag>{role}</Tag> : null}
        </div>
      ) : null}

      {facts.length ? (
        <dl className={r.facts}>
          {facts.map((f) => (
            <div key={f.label} className={r.block}>
              <dt className={ui.label}>{f.label}</dt>
              <dd className={`${ui.sub} ${ui.strong}`}>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {props.length ? (
        <div className={r.block}>
          <span className={ui.label}>Sleeper Props</span>
          {props.map((p) => (
            <span key={p.wager} className={`${r.prop} ${ui.sub}`}>
              <span>
                {p.label} <b className={ui.strong}>{p.line}</b>
              </span>
              <span>{[p.over != null ? `Over ${p.over}x` : null, p.under != null ? `Under ${p.under}x` : null].filter(Boolean).join(' · ')}</span>
            </span>
          ))}
        </div>
      ) : null}

      {usageRows.length ? (
        <div className={r.block}>
          <span className={ui.label}>Share of Team &middot; Weeks {usage.map((u) => u.week).join(', ')}</span>
          <div className={`${r.usage} ${ui.sub}`} style={{ ['--n' as string]: String(usage.length) }}>
            {usageRows.map((c) => (
              <div key={c.label} className={r.usageRow}>
                <span>{c.label}</span>
                {c.values.map((v, i) => (
                  <b key={i} className={`N ${r.num}`}>
                    {v ?? '–'}
                  </b>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button type="button" data-player={id} className={`${ui.pill} ${ui.pillSecondary} ${r.start}`} aria-label={`${name}, open player`}>
        Player details
      </button>
    </div>
  );
}
