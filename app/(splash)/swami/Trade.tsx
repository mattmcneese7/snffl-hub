import Link from 'next/link';
import { Check, Plus } from '@phosphor-icons/react/dist/ssr';
import { firstNameOf } from '@/config/managers';
import { teams } from '@/lib/league';
import { parseTeam } from '@/lib/my-team';
import { windowLabel, type RosRead } from '@/lib/rest-of-season';
import { getLeague } from '@/lib/sleeper';
import { evaluateTrade, EVEN_PER_WEEK, type TradeEval, type TradeSide } from '@/lib/trade-eval';
import Fold from '../kit/Fold';
import k from '../kit/kit.module.css';
import Icon from '../home/Icons';
import w from '../home/widgets.module.css';
import { SleeperPill } from '../scoreboard/parts/shared';
import { Chip, curl, Face, fmt, metaLine, RosMethod, RosWorking, signed } from './RosParts';
import { idList, qv, rosBoard, swamiHref, type SwamiQuery } from './moves-query';
import s from './swami.module.css';
import m from './moves.module.css';

/**
 * The trade evaluator, v2's Swami view as a Splash widget. Pick two teams and
 * who each one sends; every player is valued over the rest of the season and
 * both best lineups are rebuilt week by week, so the verdict leads with what
 * each lineup gains, raw totals beside it.
 *
 * Everything lives in the URL (a, b, pa, pb), as in v2: picking a player is a
 * link that adds or removes him, so a half built trade can be pasted into the
 * group chat as it stands. The first team defaults to yours.
 */

const ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teams.find((t) => t.rosterId === rosterId)?.manager ?? `Team ${rosterId}`;
const teamNameOf = (rosterId: number) => teams.find((t) => t.rosterId === rosterId)?.teamName ?? `Team ${rosterId}`;

function sortRoster(reads: RosRead[]) {
  return [...reads].sort(
    (x, y) => ORDER.indexOf(x.player.position) - ORDER.indexOf(y.player.position) || (y.total ?? -1) - (x.total ?? -1)
  );
}

/** One incoming player: the research row, opening onto his working. */
function GetsRow({ read }: { read: RosRead }) {
  return (
    <li>
      <details className={s.item}>
        <summary className={s.row}>
          <Face read={read} className={s.face} />
          <span className={s.who}>
            <span className={s.name}>{read.player.name}</span>
            <span className={s.meta}>{metaLine(read)}</span>
          </span>
          <span className={s.proj}>
            <span className={s.projNum}>{read.total != null ? fmt(read.total) : 'No read'}</span>
            <span className={s.chev} aria-hidden />
          </span>
        </summary>
        <div className={s.detail}>
          <RosWorking read={read} />
          <Link href={`/players/${read.player.id}`} className={s.go}>
            Player page
          </Link>
        </div>
      </details>
    </li>
  );
}

function verdictFor(side: TradeSide, result: TradeEval, which: 'a' | 'b') {
  if (result.call === which) return { value: 'Wins', hot: true };
  if (side.perWeek >= EVEN_PER_WEEK) return { value: 'Gains', hot: false };
  if (side.perWeek <= -EVEN_PER_WEEK) return { value: 'Loses', hot: false };
  return { value: 'Even', hot: false };
}

function SideCard({ side, result, which }: { side: TradeSide; result: TradeEval; which: 'a' | 'b' }) {
  const v = verdictFor(side, result, which);
  const owed = side.rosterChange;
  return (
    <div className={m.side}>
      <div className={m.sideHead}>
        <Link href={`/managers/${side.rosterId}`} className={m.sideName}>
          {side.manager}
          <span className={m.sideTeam}>{side.teamName}</span>
        </Link>
        <span className={`${m.delta} ${side.perWeek >= EVEN_PER_WEEK ? m.deltaUp : ''}`}>{signed(side.delta)}</span>
      </div>
      <span className={s.tags}>
        <Chip label="Verdict" value={v.value} hot={v.hot} plain={v.value === 'Loses' || v.value === 'Even'} />
        <Chip label="Best lineup" value={`${fmt(side.before)} to ${fmt(side.after)}`} plain />
        <Chip label="Per week" value={signed(side.perWeek)} plain />
        <Chip label="Raw in" value={fmt(side.rawGets)} plain />
        <Chip label="Raw out" value={fmt(side.rawSends)} plain />
      </span>
      <span className={m.sub}>{side.manager} gets</span>
      {side.gets.length ? (
        <ul className={m.sideList}>
          {side.gets.map((r) => (
            <GetsRow key={r.player.id} read={r} />
          ))}
        </ul>
      ) : (
        <p className={w.empty}>Nothing yet. Pick from the other roster.</p>
      )}
      {owed > 0 ? (
        <p className={s.note}>
          Takes on {owed} more {owed === 1 ? 'player' : 'players'} than he sends, so {owed === 1 ? 'a drop is' : 'drops are'}{' '}
          owed. The lineup math assumes {owed === 1 ? 'it comes' : 'they come'} off the bench.
        </p>
      ) : null}
    </div>
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
  // Anything in the URL that is not on that roster any more is dropped
  // quietly: a pasted link from last week still opens on the rest.
  const pa = idList(qv(query, 'pa')).filter((id) => rosterA.includes(id));
  const pb = idList(qv(query, 'pb')).filter((id) => rosterB.includes(id));

  const href = (next: { a?: number | null; b?: number | null; pa?: string[]; pb?: string[] }) => {
    const na = next.a !== undefined ? next.a : a;
    const nb = next.b !== undefined ? next.b : b;
    const npa = next.pa ?? pa;
    const npb = next.pb ?? pb;
    return swamiHref(query, {
      a: na ? String(na) : null,
      b: nb ? String(nb) : null,
      pa: npa.length ? npa.join(',') : null,
      pb: npb.length ? npb.join(',') : null,
    });
  };

  const ready = a && b && (pa.length || pb.length);
  const result = ready
    ? evaluateTrade({
        a: { rosterId: a, roster: rosterA, sends: pa },
        b: { rosterId: b, roster: rosterB, sends: pb },
        readOf,
        ctx,
      })
    : null;

  // Yours first, then the league in Sleeper's order.
  const ordered = [...teams].sort((x, y) => Number(y.rosterId === mine) - Number(x.rosterId === mine));
  const window = windowLabel(ctx);

  return (
    <Fold
      className={`${w.widget} ${w.m} ${m.fold}`}
      headClassName={m.foldHead}
      label="the trade evaluator"
      defaultOpen={Boolean(b)}
      head={
        <>
          <Icon name="swap" className={w.headIcon} />
          <span className={w.title}>Trade evaluator</span>
          <span className={`${w.sub} ${m.foldAside}`}>{window.charAt(0).toUpperCase() + window.slice(1)}</span>
        </>
      }
    >
      <div className={m.body}>
        {result ? (
          <>
            <div className={m.verdict}>
              <p>{curl(result.verdict)}</p>
              {result.rawNote ? <p>{curl(result.rawNote)}</p> : null}
              {result.unread.length ? (
                <p>
                  No read on {result.unread.map((r) => r.player.name).join(' or ')} (
                  {result.unread.map((r) => r.noRead).join('; ')}), so {result.unread.length === 1 ? 'he counts' : 'they count'}{' '}
                  as zero here. Weigh {result.unread.length === 1 ? 'him' : 'them'} yourself.
                </p>
              ) : null}
            </div>

            <div className={m.sides}>
              <SideCard side={result.a} result={result} which="a" />
              <SideCard side={result.b} result={result} which="b" />
            </div>

            <details className={m.weeksWrap}>
              <summary>
                Week by week, best lineup before and after
                <span className={m.chev} aria-hidden />
              </summary>
              <div className={m.weeks} role="table">
                <div className={`${m.weeksRow} ${m.weeksHead}`} role="row">
                  <span role="columnheader">Week</span>
                  <span role="columnheader">{result.a.manager}</span>
                  <span role="columnheader">{result.b.manager}</span>
                </div>
                {result.a.byWeek.map((wa, i) => {
                  const wb = result.b.byWeek[i];
                  return (
                    <div key={wa.week} className={m.weeksRow} role="row">
                      <span role="cell" className={m.weekNum}>
                        {wa.week}
                      </span>
                      {[wa, wb].map((x, j) => (
                        <span key={j} role="cell" className={m.weekCell}>
                          <b>{signed(x.after - x.before)}</b>
                          <span>
                            {fmt(x.before)} to {fmt(x.after)}
                          </span>
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        ) : (
          <p className={s.note}>{!a || !b ? 'Choose both teams to start.' : 'Now pick at least one player from either roster.'}</p>
        )}

        {(['a', 'b'] as const).map((which) => {
          const id = which === 'a' ? a : b;
          const other = which === 'a' ? b : a;
          const roster = which === 'a' ? rosterA : rosterB;
          const picked = which === 'a' ? pa : pb;
          return (
            <div key={which} className={m.group}>
              <span className={m.label}>
                {which === 'a' ? 'First team sends' : 'Second team sends'}
                {id ? (
                  <>
                    {' '}
                    | <b>{teamNameOf(id)}</b>
                  </>
                ) : null}
              </span>
              <nav className={m.rail} aria-label={which === 'a' ? 'First team' : 'Second team'}>
                {ordered
                  .filter((t) => t.rosterId !== other)
                  .map((t) => {
                    const on = t.rosterId === id;
                    return (
                      <Link
                        key={t.rosterId}
                        href={href({ [which]: t.rosterId, [`p${which}`]: [] })}
                        scroll={false}
                        className={`${k.week} ${on ? k.weekOn : ''}`}
                        aria-current={on ? 'true' : undefined}
                      >
                        {managerOf(t.rosterId)}
                      </Link>
                    );
                  })}
              </nav>
              {id ? (
                roster.length ? (
                  <ul className={m.roster}>
                    {sortRoster(roster.map(readOf)).map((r) => {
                      const on = picked.includes(r.player.id);
                      return (
                        <li key={r.player.id}>
                          <Link
                            href={href({ [`p${which}`]: toggle(picked, r.player.id) })}
                            scroll={false}
                            className={`${m.pick} ${on ? m.pickOn : ''}`}
                            aria-pressed={on}
                            aria-label={`${on ? 'Remove' : 'Add'} ${r.player.name}`}
                          >
                            <Face read={r} className={m.face} />
                            <span className={s.who}>
                              <span className={s.name}>{r.player.name}</span>
                              <span className={s.meta}>{metaLine(r)}</span>
                            </span>
                            {r.total != null ? <span className={m.total}>{fmt(r.total)}</span> : <span className={m.totalNone}>No read</span>}
                            <span className={`${m.mark} ${on ? m.markOn : ''}`} aria-hidden>
                              {on ? <Check weight="bold" /> : <Plus weight="bold" />}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={w.empty}>That roster didn&rsquo;t load from Sleeper. Try again in a minute.</p>
                )
              ) : null}
            </div>
          );
        })}

        <p className={s.note}>
          Numbers are rest of season points, {window}. Called even under {EVEN_PER_WEEK} point a week either way: a single
          weekly projection misses by about five points on average, so a smaller gap isn&rsquo;t something this can tell
          from nothing. Draft picks and FAAB aren&rsquo;t valued.
        </p>
        <RosMethod ctx={ctx} />
        <div className={m.foot}>
          <SleeperPill action="trades" label="Propose a trade" />
          {deadline && deadline <= 18 ? <Chip label="Trade deadline" value={`Week ${deadline}`} plain /> : null}
        </div>
      </div>
    </Fold>
  );
}
