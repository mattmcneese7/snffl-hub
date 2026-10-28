import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { teams } from '@/lib/league';
import { parseTeam } from '@/lib/my-team';
import { windowLabel, type RosRead } from '@/lib/rest-of-season';
import { getLeague } from '@/lib/sleeper';
import { evaluateTrade, EVEN_PER_WEEK, type TradeEval, type TradeSide } from '@/lib/trade-eval';
import { idList, qv, swamiHref, type SwamiQuery } from '../../../swami/moves-query';
import { rosBoard } from '../cached';
import { Card, Chip, Chips, Drawer, Empty, List, Pill, Rail, Section, Tag, Versus, ui as u } from '../ui';
import { ExpandRow } from '../ui/blocks/ExpandRow';
import { FilterSheet } from '../ui/blocks/FilterSheet';
import CopyMove from './CopyMove';
import { BASE, curl, fmt, PlayerFace, PlayerSub, RosMethod, RosWorking, short, signed, tabbed } from './parts';
import w from './swami.module.css';

/**
 * The trade checker. Pick two teams and who each one sends; every player is
 * valued over the rest of the season and both best lineups are rebuilt week
 * by week, so the verdict leads with what each lineup gains. It all lives in
 * the URL (a, b, pa, pb), so a half built trade is a link to paste in the
 * group chat. The first team defaults to yours.
 */

const ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const managerOf = (rosterId: number) => firstNameOf(rosterId) ?? teams.find((t) => t.rosterId === rosterId)?.manager ?? `Team ${rosterId}`;
const teamNameOf = (rosterId: number) => teams.find((t) => t.rosterId === rosterId)?.teamName.trim() ?? `Team ${rosterId}`;

const sortRoster = (reads: RosRead[]) =>
  [...reads].sort((x, y) => ORDER.indexOf(x.player.position) - ORDER.indexOf(y.player.position) || (y.total ?? -1) - (x.total ?? -1));

function verdictFor(side: TradeSide, result: TradeEval, which: 'a' | 'b') {
  if (result.call === which) return <Tag tone="good">Wins</Tag>;
  if (side.perWeek >= EVEN_PER_WEEK) return <Tag tone="good">Gains</Tag>;
  if (side.perWeek <= -EVEN_PER_WEEK) return <Tag tone="bad">Loses</Tag>;
  return <Tag>Even</Tag>;
}

/** One player on a roster to pick from: tap to add him to the trade, again to take him out. */
function PickRow({ read, on, href }: { read: RosRead; on: boolean; href: string }) {
  return (
    <Link href={href} scroll={false} className={u.row} aria-label={`${on ? 'Remove' : 'Add'} ${read.player.name}`}>
      <PlayerFace read={read} />
      <span className={u.body}>
        {on ? <span className={`${u.label} ${u.labelBrand}`}>In trade</span> : null}
        <span className={`${u.title} ${on ? u.strong : ''}`}>{short(read.player.name, read.player.position)}</span>
        <span className={u.sub}>
          <PlayerSub read={read} />
        </span>
      </span>
      <span className={u.trail}>
        <span className={u.value}>{read.total != null ? fmt(read.total) : 'No read'}</span>
      </span>
    </Link>
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
    return tabbed(
      swamiHref(query, { a: na ? String(na) : null, b: nb ? String(nb) : null, pa: npa.length ? npa.join(',') : null, pb: npb.length ? npb.join(',') : null }, BASE),
      'trade',
    );
  };

  const ready = a && b && (pa.length || pb.length);
  const result = ready
    ? evaluateTrade({ a: { rosterId: a, roster: rosterA, sends: pa }, b: { rosterId: b, roster: rosterB, sends: pb }, readOf, ctx })
    : null;
  const ordered = [...teams].sort((x, y) => Number(y.rosterId === mine) - Number(x.rosterId === mine));
  const window = windowLabel(ctx);
  const names = (ids: string[]) => ids.map((id) => short(readOf(id).player.name, readOf(id).player.position)).join(', ');
  const move = ready ? `Trade: ${teamNameOf(a)} sends ${pa.length ? names(pa) : 'nothing'}. ${teamNameOf(b)} sends ${pb.length ? names(pb) : 'nothing'}.` : null;
  const gets = result ? [...result.a.gets, ...result.b.gets] : [];

  const picker = (which: 'a' | 'b') => {
    const id = which === 'a' ? a : b;
    const other = which === 'a' ? b : a;
    return (
      <FilterSheet id={`trade-${which}`} label={id ? managerOf(id) : which === 'a' ? 'First team' : 'Second team'} title={which === 'a' ? 'First Team' : 'Second Team'} on={Boolean(id)}>
        <Card>
          <Chips label={which === 'a' ? 'First team' : 'Second team'}>
            {ordered
              .filter((t) => t.rosterId !== other)
              .map((t) => (
                <Chip key={t.rosterId} href={href({ [which]: t.rosterId, [`p${which}`]: [] })} on={t.rosterId === id}>
                  {managerOf(t.rosterId)}
                </Chip>
              ))}
          </Chips>
        </Card>
      </FilterSheet>
    );
  };

  return (
    <>
      <Rail label="Trade teams">
        {picker('a')}
        {picker('b')}
      </Rail>

      {result ? (
        <>
          <Card>
            <p className={u.bodyText}>{curl(result.verdict)}</p>
            {result.rawNote ? <p className={u.bodyText}>{curl(result.rawNote)}</p> : null}
            {result.unread.length ? (
              <p className={`${u.sub} ${w.note}`}>
                No read on {result.unread.map((r) => r.player.name).join(' or ')} ({result.unread.map((r) => r.noRead).join('; ')}), so{' '}
                {result.unread.length === 1 ? 'he counts' : 'they count'} as zero here.
              </p>
            ) : null}
            <Versus
              left={<span className={`${u.title} ${u.strong}`}>{result.a.teamName}</span>}
              right={<span className={`${u.title} ${u.strong}`}>{result.b.teamName}</span>}
              rows={[
                { label: 'Verdict', a: verdictFor(result.a, result, 'a'), b: verdictFor(result.b, result, 'b') },
                { label: 'Lineup', a: signed(result.a.delta), b: signed(result.b.delta) },
                { label: 'Per week', a: signed(result.a.perWeek), b: signed(result.b.perWeek) },
                { label: 'Lineup now', a: fmt(result.a.before), b: fmt(result.b.before) },
                { label: 'After', a: fmt(result.a.after), b: fmt(result.b.after) },
                { label: 'Raw in', a: fmt(result.a.rawGets), b: fmt(result.b.rawGets) },
                { label: 'Raw out', a: fmt(result.a.rawSends), b: fmt(result.b.rawSends) },
              ]}
            />
            {[result.a, result.b]
              .filter((x) => x.rosterChange > 0)
              .map((x) => (
                <p key={x.rosterId} className={`${u.sub} ${w.note}`}>
                  {x.teamName} takes on {x.rosterChange} more {x.rosterChange === 1 ? 'player' : 'players'} than it sends, so {x.rosterChange === 1 ? 'a drop is' : 'drops are'} owed. The
                  lineup math assumes {x.rosterChange === 1 ? 'it comes' : 'they come'} off the bench.
                </p>
              ))}
            {move ? <CopyMove text={move} label="Copy trade" /> : null}
          </Card>
          <Drawer title="Week by Week" value={`${result.a.byWeek.length} weeks`}>
            <div className={w.drawerBody}>
              <Versus
                left={<span className={u.label}>{result.a.teamName}</span>}
                right={<span className={u.label}>{result.b.teamName}</span>}
                rows={result.a.byWeek.map((wa, i) => ({ label: `Week ${wa.week}`, a: signed(wa.after - wa.before), b: signed(result.b.byWeek[i].after - result.b.byWeek[i].before) }))}
              />
            </div>
          </Drawer>
          <Drawer title="Player Values" value={`${gets.length} ${gets.length === 1 ? 'player' : 'players'}`}>
            {gets.map((r) => (
              <ExpandRow key={r.player.id} lead={<PlayerFace read={r} />} title={short(r.player.name, r.player.position)} sub={<PlayerSub read={r} />} value={r.total != null ? fmt(r.total) : 'No read'}>
                <RosWorking read={r} />
                <Pill href={`/players/${r.player.id}`} kind="secondary">
                  Player page
                </Pill>
              </ExpandRow>
            ))}
          </Drawer>
        </>
      ) : (
        <Empty>{!a || !b ? 'Pick two teams.' : 'Pick a player from either roster.'}</Empty>
      )}

      {(['a', 'b'] as const).map((which) => {
        const id = which === 'a' ? a : b;
        if (!id) return null;
        const roster = which === 'a' ? rosterA : rosterB;
        const picked = which === 'a' ? pa : pb;
        return (
          <Section key={which} title={`${teamNameOf(id)} Sends`}>
            {roster.length ? (
              <List tap>
                {sortRoster(roster.map(readOf)).map((r) => (
                  <PickRow key={r.player.id} read={r} on={picked.includes(r.player.id)} href={href({ [`p${which}`]: toggle(picked, r.player.id) })} />
                ))}
              </List>
            ) : (
              <Empty>That roster didn&rsquo;t load from Sleeper. Try again in a minute.</Empty>
            )}
          </Section>
        );
      })}

      <p className={`${u.sub} ${w.inset}`}>
        Rest of season points, {window}. Called even under {EVEN_PER_WEEK} point a week either way, since a single weekly projection misses by about five points
        on average. Draft picks and FAAB aren&rsquo;t valued.
        {deadline && deadline <= 18 ? ` Trade deadline: week ${deadline}.` : ''}
      </p>
      <RosMethod ctx={ctx} />
    </>
  );
}
