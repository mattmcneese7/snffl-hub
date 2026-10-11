import Link from 'next/link';
import SwamiSelect from '@/components/SwamiSelect';
import { firstNameOf } from '@/config/managers';
import { teams } from '@/lib/league';
import type { RosBoard } from '@/lib/ros-load';
import type { RosRead } from '@/lib/rest-of-season';
import { evaluateTrade, EVEN_PER_WEEK, type TradeSide } from '@/lib/trade-eval';
import { RosMethod, RosPlayerWorking } from '@/components/SwamiWorking';

/**
 * The trade evaluator, a view of the Swami.
 *
 * Everything lives in the URL: the two teams and who each one sends. Picking a
 * player is a link that adds or removes him, so there is no client state to
 * lose and a half built trade can be pasted into the group chat as it stands.
 */

export type TradeParams = { a: number | null; b: number | null; pa: string[]; pb: string[] };

const ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export function tradeHref(p: TradeParams) {
  const q = new URLSearchParams({ view: 'trade' });
  if (p.a) q.set('a', String(p.a));
  if (p.b) q.set('b', String(p.b));
  if (p.pa.length) q.set('pa', p.pa.join(','));
  if (p.pb.length) q.set('pb', p.pb.join(','));
  return `/swami?${q.toString()}`;
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

const teamLabel = (rosterId: number) => {
  const t = teams.find((x) => x.rosterId === rosterId);
  return `${t?.teamName ?? `Team ${rosterId}`} (${firstNameOf(rosterId) ?? t?.manager ?? ''})`;
};

const fmt = (n: number) => n.toFixed(1);
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`;
const tone = (n: number) =>
  n >= EVEN_PER_WEEK ? 'snffl-swami-up' : n <= -EVEN_PER_WEEK ? 'snffl-swami-down' : 'snffl-swami-flat';

function sortRoster(reads: RosRead[]) {
  return [...reads].sort(
    (x, y) =>
      ORDER.indexOf(x.player.position) - ORDER.indexOf(y.player.position) ||
      (y.total ?? -1) - (x.total ?? -1)
  );
}

function RosterPicker({
  reads,
  picked,
  hrefFor,
}: {
  reads: RosRead[];
  picked: string[];
  hrefFor: (id: string) => string;
}) {
  return (
    <div className="snffl-card snffl-swami-roster">
      {sortRoster(reads).map((r) => {
        const on = picked.includes(r.player.id);
        return (
          <Link
            key={r.player.id}
            href={hrefFor(r.player.id)}
            scroll={false}
            className={`snffl-swami-pick${on ? ' snffl-swami-pick-on' : ''}`}
            aria-pressed={on}
          >
            <span className="snffl-swami-pick-mark" aria-hidden>
              {on ? 'In' : '+'}
            </span>
            <span className="snffl-swami-name">
              <strong>{r.player.name}</strong>
              <em>
                {r.player.position} · {r.player.team ?? 'FA'}
                {r.status ? ` · ${r.status}` : ''}
              </em>
            </span>
            <span className="snffl-swami-pick-val">
              {r.total != null ? fmt(r.total) : <em>no read</em>}
            </span>
          </Link>
        );
      })}
      {!reads.length ? (
        <p className="snffl-swami-empty">Roster did not load from Sleeper. Try again in a minute.</p>
      ) : null}
    </div>
  );
}

function SideCard({ side, window }: { side: TradeSide; window: string }) {
  return (
    <div className="snffl-card snffl-swami-side">
      <div className="snffl-swami-side-head">
        <span className="snffl-label">{side.manager}&apos;s lineup</span>
        <strong className={tone(side.perWeek)}>{signed(side.delta)}</strong>
      </div>
      <p className="snffl-swami-side-sub">
        Best lineup over {window}: {fmt(side.before)} now, {fmt(side.after)} after, which is{' '}
        {signed(side.perWeek)} a week.
      </p>
      <span className="snffl-label">{side.manager} gets</span>
      <div className="snffl-swami-side-list">
        {side.gets.length ? (
          side.gets.map((r) => <RosPlayerWorking key={r.player.id} read={r} />)
        ) : (
          <p className="snffl-swami-empty">Nothing yet. Pick from the other roster.</p>
        )}
      </div>
      <p className="snffl-swami-side-sub">
        Raw rest of season points in {fmt(side.rawGets)}, out {fmt(side.rawSends)}.
        {side.rosterChange > 0
          ? ` Takes on ${side.rosterChange} more ${side.rosterChange === 1 ? 'player' : 'players'} than he sends, so ${side.rosterChange === 1 ? 'a drop is' : 'drops are'} owed; the lineup math assumes ${side.rosterChange === 1 ? 'it comes' : 'they come'} off the bench.`
          : ''}
      </p>
    </div>
  );
}

export default async function SwamiTrade({
  board,
  params,
  deadline,
}: {
  board: RosBoard;
  params: TradeParams;
  deadline: number | null;
}) {
  const { ctx, rosters, readOf } = board;
  const rosterOf = (id: number | null) =>
    id ? (rosters.find((r) => r.roster_id === id)?.players ?? []) : [];

  const a = params.a;
  const b = params.b && params.b !== a ? params.b : null;
  const rosterA = rosterOf(a);
  const rosterB = rosterOf(b);
  // Anything in the URL that is not on that roster any more is dropped
  // silently: a pasted link from last week should still open on the rest.
  const pa = params.pa.filter((id) => rosterA.includes(id));
  const pb = params.pb.filter((id) => rosterB.includes(id));
  const current: TradeParams = { a, b, pa, pb };

  const teamOptions = (which: 'a' | 'b') => [
    { value: '', label: 'Choose a team', href: tradeHref({ ...current, [which]: null, [`p${which}`]: [] }) },
    ...teams
      .filter((t) => t.rosterId !== (which === 'a' ? b : a))
      .map((t) => ({
        value: String(t.rosterId),
        label: teamLabel(t.rosterId),
        href: tradeHref({ ...current, [which]: t.rosterId, [`p${which}`]: [] }),
      })),
  ];

  const ready = a && b && (pa.length || pb.length);
  const result = ready
    ? evaluateTrade({
        a: { rosterId: a, roster: rosterA, sends: pa },
        b: { rosterId: b, roster: rosterB, sends: pb },
        readOf,
        ctx,
      })
    : null;

  return (
    <>
      <section>
        <div className="snffl-block-heading">
          <h2 className="snffl-headline">Trade Evaluator</h2>
        </div>
        <p className="snffl-swami-intro">
          Pick two teams and who each one sends. The Swami values every player over the rest of
          the season, then rebuilds both best lineups week by week, so a player who would only sit
          on a bench counts for what he adds, not for what he scores.
          {deadline ? ` Sleeper lists the trade deadline as week ${deadline}.` : ''}
        </p>
      </section>

      {result ? (
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">The Verdict</h2>
            <span className="snffl-block-heading-link">{result.window}</span>
          </div>
          <div className="snffl-card snffl-swami-verdict">
            <p className="snffl-swami-line">{result.verdict}</p>
            {result.rawNote ? <p className="snffl-swami-line">{result.rawNote}</p> : null}
            {result.unread.length ? (
              <p className="snffl-swami-caveat">
                No read on {result.unread.map((r) => r.player.name).join(' or ')} (
                {result.unread.map((r) => r.noRead).join('; ')}), so{' '}
                {result.unread.length === 1 ? 'he counts' : 'they count'} as zero here. Weigh{' '}
                {result.unread.length === 1 ? 'him' : 'them'} yourself.
              </p>
            ) : null}
          </div>

          <div className="snffl-swami-trade-grid">
            <SideCard side={result.a} window={result.window} />
            <SideCard side={result.b} window={result.window} />
          </div>

          <details className="snffl-card snffl-swami-working">
            <summary>Week by week, best lineup before and after</summary>
            <div className="snffl-swami-weeks" role="table">
              <div className="snffl-swami-weeks-row snffl-swami-weeks-head" role="row">
                <span role="columnheader">Week</span>
                <span role="columnheader">{result.a.manager}</span>
                <span role="columnheader">{result.b.manager}</span>
              </div>
              {result.a.byWeek.map((w, i) => {
                const bw = result.b.byWeek[i];
                const da = w.after - w.before;
                const db = bw.after - bw.before;
                return (
                  <div key={w.week} className="snffl-swami-weeks-row" role="row">
                    <span role="cell">{w.week}</span>
                    <span role="cell">
                      {fmt(w.before)} to {fmt(w.after)} <em className={tone(da)}>{signed(da)}</em>
                    </span>
                    <span role="cell">
                      {fmt(bw.before)} to {fmt(bw.after)} <em className={tone(db)}>{signed(db)}</em>
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        </section>
      ) : null}

      <section>
        <div className="snffl-block-heading">
          <h2 className="snffl-headline">{result ? 'Change the Deal' : 'Build the Deal'}</h2>
        </div>
        {!result ? (
          <p className="snffl-swami-caveat">
            {!a || !b
              ? 'Choose both teams to start.'
              : 'Now pick at least one player from either roster.'}
          </p>
        ) : null}
        <div className="snffl-swami-trade-grid">
          {(['a', 'b'] as const).map((which) => {
            const id = which === 'a' ? a : b;
            const roster = which === 'a' ? rosterA : rosterB;
            const picked = which === 'a' ? pa : pb;
            return (
              <div key={which} className="snffl-swami-trade-col">
                <SwamiSelect
                  id={`snffl-swami-team-${which}`}
                  label={which === 'a' ? 'First team sends' : 'Second team sends'}
                  value={id ? String(id) : ''}
                  options={teamOptions(which)}
                />
                {id ? (
                  <RosterPicker
                    reads={roster.map(readOf)}
                    picked={picked}
                    hrefFor={(pid) =>
                      tradeHref({ ...current, [`p${which}`]: toggle(picked, pid) } as TradeParams)
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <RosMethod ctx={ctx} />
      <p className="snffl-swami-caveat">
        Called even under {EVEN_PER_WEEK} point a week either way: a single weekly projection misses
        by about five points on average, so a smaller gap is not something this can tell from
        nothing.
      </p>
    </>
  );
}
