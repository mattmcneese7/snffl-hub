import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { teams } from '@/lib/league';
import { parseTeam } from '@/lib/my-team';
import { windowLabel, type RosRead } from '@/lib/rest-of-season';
import { getLeague } from '@/lib/sleeper';
import { evaluateTrade, EVEN_PER_WEEK, type TradeEval, type TradeSide } from '@/lib/trade-eval';
import { idList, qv, swamiHref, type SwamiQuery } from '../../../swami/moves-query';
import { rosBoard } from '../cached';
import { Ms } from '../icons';
import CopyMove from './CopyMove';
import { curl, Face, fmt, metaLine, Panel, Pos, RosMethod, RosWorking, short, signed, Tag } from './parts';
import w from './swami.module.css';

/**
 * The trade checker. Pick two teams and who each one sends; every player is
 * valued over the rest of the season and both best lineups are rebuilt week
 * by week, so the verdict leads with what each lineup gains. It all lives in
 * the URL (a, b, pa, pb), so a half built trade is a link to paste in the
 * group chat. The first team defaults to yours.
 */

const BASE = '/lab/app/swami';
const ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teams.find((t) => t.rosterId === rosterId)?.manager ?? `Team ${rosterId}`;
const teamNameOf = (rosterId: number) => teams.find((t) => t.rosterId === rosterId)?.teamName ?? `Team ${rosterId}`;

const sortRoster = (reads: RosRead[]) =>
  [...reads].sort((x, y) => ORDER.indexOf(x.player.position) - ORDER.indexOf(y.player.position) || (y.total ?? -1) - (x.total ?? -1));

function verdictFor(side: TradeSide, result: TradeEval, which: 'a' | 'b'): { text: string; tone?: 'good' | 'bad' } {
  if (result.call === which) return { text: 'Wins', tone: 'good' };
  if (side.perWeek >= EVEN_PER_WEEK) return { text: 'Gains', tone: 'good' };
  if (side.perWeek <= -EVEN_PER_WEEK) return { text: 'Loses', tone: 'bad' };
  return { text: 'Even' };
}

function Incoming({ read }: { read: RosRead }) {
  return (
    <details className={w.item}>
      <summary className={w.row}>
        <Face read={read} />
        <span className={w.who}>
          <b>{read.player.name}</b>
          <small>
            <Pos pos={read.player.position} /> {metaLine(read)}
          </small>
        </span>
        <span className={w.num}>
          <b>{read.total != null ? fmt(read.total) : 'No read'}</b>
          <small>Rest of season</small>
        </span>
      </summary>
      <div className={w.detail}>
        <RosWorking read={read} />
        <Link href={`/lab/app/players/${read.player.id}`} className={w.go}>
          Player page
        </Link>
      </div>
    </details>
  );
}

function Side({ side, result, which }: { side: TradeSide; result: TradeEval; which: 'a' | 'b' }) {
  const v = verdictFor(side, result, which);
  const owed = side.rosterChange;
  return (
    <section className={w.side} aria-label={`${side.teamName} side`}>
      <div className={w.sideHead}>
        <Link href={`/lab/app/managers/${side.rosterId}`} className={w.sideName}>
          <b>{side.teamName}</b>
          <small>{side.manager}</small>
        </Link>
        <span className={`${w.delta} ${v.tone === 'good' ? w.up : v.tone === 'bad' ? w.down : ''}`}>{signed(side.delta)}</span>
      </div>
      <div className={w.tags}>
        <Tag label="Verdict" value={v.text} tone={v.tone} />
        <Tag label="Best lineup" value={`${fmt(side.before)} to ${fmt(side.after)}`} />
        <Tag label="Per week" value={signed(side.perWeek)} />
        <Tag label="Raw in" value={fmt(side.rawGets)} />
        <Tag label="Raw out" value={fmt(side.rawSends)} />
      </div>
      <p className={w.sub}>{side.teamName} Gets</p>
      {side.gets.length ? (
        <div className={w.rows}>
          {side.gets.map((r) => (
            <Incoming key={r.player.id} read={r} />
          ))}
        </div>
      ) : (
        <p className={w.empty}>Nothing yet. Pick from the other roster.</p>
      )}
      {owed > 0 ? (
        <p className={w.note}>
          Takes on {owed} more {owed === 1 ? 'player' : 'players'} than it sends, so {owed === 1 ? 'a drop is' : 'drops are'} owed. The lineup math assumes{' '}
          {owed === 1 ? 'it comes' : 'they come'} off the bench.
        </p>
      ) : null}
    </section>
  );
}

export default async function Trade({ query, mine }: { query: SwamiQuery; mine: number | null }) {
  const [board, deadline] = await Promise.all([
    rosBoard(),
    getLeague()
      .then((l) => l.settings?.trade_deadline ?? null)
      .catch(() => null),
  ]);
  const { ctx, rosters, readOf } = board;
  const rosterOf = (id: number | null) => (id ? (rosters.find((r) => r.roster_id === id)?.players ?? []) : []);

  const a = parseTeam(qv(query, 'a')) ?? mine;
  const bRaw = parseTeam(qv(query, 'b'));
  const b = bRaw && bRaw !== a ? bRaw : null;
  const rosterA = rosterOf(a);
  const rosterB = rosterOf(b);
  // Anything in the URL that is no longer on that roster drops out quietly,
  // so a pasted link from last week still opens on the rest.
  const pa = idList(qv(query, 'pa')).filter((id) => rosterA.includes(id));
  const pb = idList(qv(query, 'pb')).filter((id) => rosterB.includes(id));

  const href = (next: { a?: number | null; b?: number | null; pa?: string[]; pb?: string[] }) => {
    const na = next.a !== undefined ? next.a : a;
    const nb = next.b !== undefined ? next.b : b;
    const npa = next.pa ?? pa;
    const npb = next.pb ?? pb;
    return swamiHref(
      query,
      { a: na ? String(na) : null, b: nb ? String(nb) : null, pa: npa.length ? npa.join(',') : null, pb: npb.length ? npb.join(',') : null },
      BASE,
    );
  };

  const ready = a && b && (pa.length || pb.length);
  const result = ready
    ? evaluateTrade({ a: { rosterId: a, roster: rosterA, sends: pa }, b: { rosterId: b, roster: rosterB, sends: pb }, readOf, ctx })
    : null;
  const ordered = [...teams].sort((x, y) => Number(y.rosterId === mine) - Number(x.rosterId === mine));
  const window = windowLabel(ctx);
  const names = (ids: string[]) => ids.map((id) => short(readOf(id).player.name, readOf(id).player.position)).join(', ');
  const move =
    a && b && (pa.length || pb.length)
      ? `Trade: ${teamNameOf(a)} sends ${pa.length ? names(pa) : 'nothing'}. ${teamNameOf(b)} sends ${pb.length ? names(pb) : 'nothing'}.`
      : null;

  return (
    <Panel icon="swap" title="Trade Checker" aside={window.charAt(0).toUpperCase() + window.slice(1)} open={Boolean(b)}>
      {result ? (
        <>
          <div className={w.verdict}>
            <p>{curl(result.verdict)}</p>
            {result.rawNote ? <p>{curl(result.rawNote)}</p> : null}
            {result.unread.length ? (
              <p>
                No read on {result.unread.map((r) => r.player.name).join(' or ')} ({result.unread.map((r) => r.noRead).join('; ')}), so{' '}
                {result.unread.length === 1 ? 'he counts' : 'they count'} as zero here.
              </p>
            ) : null}
          </div>
          <div className={w.sides}>
            <Side side={result.a} result={result} which="a" />
            <Side side={result.b} result={result} which="b" />
          </div>
          <details className={w.more}>
            <summary>
              Week by Week
              <Ms name="expand" size={20} className={w.chev} />
            </summary>
            <div className={w.weeks} role="table" aria-label="Best lineup before and after, by week">
              <div className={`${w.weeksRow} ${w.weeksHead}`} role="row">
                <span role="columnheader">Wk</span>
                <span role="columnheader">{result.a.teamName}</span>
                <span role="columnheader">{result.b.teamName}</span>
              </div>
              {result.a.byWeek.map((wa, i) => {
                const wb = result.b.byWeek[i];
                return (
                  <div key={wa.week} className={w.weeksRow} role="row">
                    <span role="cell" className={w.weekNum}>
                      {wa.week}
                    </span>
                    {[wa, wb].map((x, j) => (
                      <span key={j} role="cell" className={w.weekCell}>
                        <b>{signed(x.after - x.before)}</b>
                        <small>
                          {fmt(x.before)} to {fmt(x.after)}
                        </small>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </details>
        </>
      ) : (
        <p className={w.note}>{!a || !b ? 'Choose both teams to start.' : 'Now pick at least one player from either roster.'}</p>
      )}

      {(['a', 'b'] as const).map((which) => {
        const id = which === 'a' ? a : b;
        const other = which === 'a' ? b : a;
        const roster = which === 'a' ? rosterA : rosterB;
        const picked = which === 'a' ? pa : pb;
        return (
          <div key={which} className={w.group}>
            <p className={w.sub}>
              {which === 'a' ? 'First Team Sends' : 'Second Team Sends'}
              {id ? <b> &middot; {teamNameOf(id)}</b> : null}
            </p>
            <nav className={w.rail} aria-label={which === 'a' ? 'First team' : 'Second team'}>
              {ordered
                .filter((t) => t.rosterId !== other)
                .map((t) => {
                  const on = t.rosterId === id;
                  return (
                    <Link
                      key={t.rosterId}
                      href={href({ [which]: t.rosterId, [`p${which}`]: [] })}
                      scroll={false}
                      className={`${w.chip} ${on ? w.chipOn : ''}`}
                      aria-current={on ? 'true' : undefined}
                    >
                      {managerOf(t.rosterId)}
                    </Link>
                  );
                })}
            </nav>
            {id ? (
              roster.length ? (
                <div className={w.rows}>
                  {sortRoster(roster.map(readOf)).map((r) => {
                    const on = picked.includes(r.player.id);
                    return (
                      <Link
                        key={r.player.id}
                        href={href({ [`p${which}`]: toggle(picked, r.player.id) })}
                        scroll={false}
                        className={`${w.row} ${w.pick} ${on ? w.pickOn : ''}`}
                        aria-pressed={on}
                        aria-label={`${on ? 'Remove' : 'Add'} ${r.player.name}`}
                      >
                        <Face read={r} />
                        <span className={w.who}>
                          <b>{r.player.name}</b>
                          <small>
                            <Pos pos={r.player.position} /> {metaLine(r)}
                          </small>
                        </span>
                        <span className={w.num}>
                          <b>{r.total != null ? fmt(r.total) : 'No read'}</b>
                        </span>
                        <span className={`${w.mark} ${on ? w.markOn : ''}`} aria-hidden>
                          <Ms name={on ? 'check' : 'add'} size={16} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={w.empty}>That roster didn&rsquo;t load from Sleeper. Try again in a minute.</p>
              )
            ) : null}
          </div>
        );
      })}

      {move ? <CopyMove text={move} label="Copy trade" /> : null}
      <p className={w.note}>
        Numbers are rest of season points, {window}. Called even under {EVEN_PER_WEEK} point a week either way, since a single weekly projection misses by
        about five points on average. Draft picks and FAAB aren&rsquo;t valued.
        {deadline && deadline <= 18 ? ` Trade deadline: week ${deadline}.` : ''}
      </p>
      <RosMethod ctx={ctx} />
    </Panel>
  );
}
