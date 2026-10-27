import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { impliedTeamTotal, type GameLines, type NflGame, type NflSide } from '@/lib/gameday';
import { teamByRoster } from '@/lib/league';
import type { LiveMatchup } from '@/lib/matchup-live';
import type { Verdict, VerdictKind } from '@/lib/squirt-says';
import type { Game } from '@/lib/types';
import type { Lore } from '../../../scoreboard/parts/lore';
import type { GameView, SideView } from '../data';
import { Ms } from '../icons';
import { shortName } from './weekData';
import s from '../v4.module.css';
import x from './scores.module.css';

/** "Sun 12:00 PM", Central, the way Sleeper and ESPN print a kickoff. */
export function kickoffText(iso: string): string {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Chicago' }).format(at);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(at);
  return `${day} ${time}`;
}

/** "Q3 4:12", or "OT 2:00". */
export const quarter = (period: number | null | undefined, clock: string | null | undefined) =>
  `${period && period > 4 ? 'OT' : `Q${period ?? 1}`} ${clock ?? ''}`.trim();

export const record = (rosterId: number) => {
  const t = teamByRoster(rosterId);
  return t ? `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}` : '';
};

export const managerOf = (rosterId: number, fallback = '') => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? fallback;

export function LiveChip({ text = 'Live' }: { text?: string }) {
  return (
    <span className={s.liveChip} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <i className={s.liveDot} aria-hidden />
      {text}
    </span>
  );
}

/** The first side's chance from the left, never 0 or 100 while anything is left. */
export function WinBar({ first, caption, indent }: { first: number; caption?: string; indent?: boolean }) {
  const a = Math.min(99, Math.max(1, Math.round(first * 100)));
  return (
    <div className={`${x.wb} ${indent ? x.wbIndent : ''}`} aria-label={`${a}% to ${100 - a}%`}>
      <span>{a}%</span>
      <i>
        <u style={{ width: `${a}%` }} />
      </i>
      <span>{100 - a}%</span>
      {caption ? <span className={x.wbCap}>{caption}</span> : null}
    </div>
  );
}

/** Lore as chips: streaks, Shart weeks and chugs are the bad news; Manager of the Week the good. */
export function LoreChips({ lore, max = 2 }: { lore: Lore; max?: number }) {
  if (!lore.length) return null;
  return (
    <span className={x.chipRow}>
      {lore.slice(0, max).map((l) => (
        <span key={l.text} className={`${x.chip} ${l.hot ? x.hot : /win streak|Manager/.test(l.text) ? x.good : ''}`}>
          {l.text.replace(' | ', ' ')}
        </span>
      ))}
    </span>
  );
}

function GameRow({ side, final, preview, expected, lore }: { side: SideView; final: boolean; preview: boolean; expected: number; lore: Lore }) {
  return (
    <div className={`${x.gmRow} ${side.lost ? x.gmLost : ''}`}>
      <span className={`${s.av} ${x.avSm}`} style={{ ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" loading="lazy" /> : null}
      </span>
      <span className={x.gmWho}>
        <b>{side.team}</b>
        <small>
          {side.manager} &middot; {record(side.rosterId)}
        </small>
        <LoreChips lore={lore} />
      </span>
      <span className={x.gmScore}>
        <b>{side.score.toFixed(2)}</b>
        {!final && !preview ? <small>Proj {expected.toFixed(2)}</small> : null}
      </span>
      <small className={x.gmMark}>
        {side.mark === 'W' || side.mark === 'L' ? <b className={side.mark === 'W' ? s.win : s.loss}>{side.mark}</b> : side.mark}
      </small>
    </div>
  );
}

/**
 * One league matchup on the scoreboard: both teams with record and lore, the
 * score with its projection, Sleeper's win chance, then the margin with CLOSE
 * under 10 and where the game stands.
 */
export function GameCard({
  g,
  m,
  game,
  week,
  state,
  lore,
  label,
}: {
  g: GameView;
  m: LiveMatchup;
  game: Game;
  week: number;
  state: 'final' | 'preview' | 'live';
  lore: (rosterId: number) => Lore;
  label?: string;
}) {
  const [a, b] = m.away.rosterId === g.a.rosterId ? [m.away, m.home] : [m.home, m.away];
  const final = state === 'final' || game.status === 'final';
  const preview = state === 'preview';
  const margin = Math.abs(g.a.score - g.b.score);
  const close = !preview && margin < 10;
  const pA = Number(g.a.mark.replace('%', '')) / 100;
  return (
    <Link href={`/lab/app/matchup?id=${g.id}&week=${week}`} className={x.gm} aria-label={`${g.a.team} against ${g.b.team}`}>
      {label || game.inPlay ? (
        <span className={x.gmHead}>
          <span>{label ?? ''}</span>
          {game.inPlay ? <LiveChip /> : null}
        </span>
      ) : null}
      <GameRow side={g.a} final={final} preview={preview} expected={a.expected} lore={lore(g.a.rosterId)} />
      <GameRow side={g.b} final={final} preview={preview} expected={b.expected} lore={lore(g.b.rosterId)} />
      {!final && Number.isFinite(pA) ? <WinBar first={pA} indent /> : null}
      <span className={x.gmFoot}>
        <span>
          {preview ? (
            <>
              Proj margin <b>{margin.toFixed(2)}</b>
            </>
          ) : (
            <>
              Margin <b>{margin.toFixed(2)}</b>
            </>
          )}
          {close ? <span className={`${x.chip} ${x.close}`}>CLOSE</span> : null}
        </span>
        <span>{final ? 'Final' : preview ? 'Preview' : g.foot}</span>
      </span>
    </Link>
  );
}

const LABELS: Record<VerdictKind, string> = {
  sit: 'Sit him',
  bench: 'Start him',
  thin: 'A hole',
  trap: 'Quiet game',
  ceiling: 'Swing',
  lock: 'Safe',
  top: 'Leans on',
};
const HOT = new Set<VerdictKind>(['sit', 'bench', 'thin']);
const GOOD = new Set<VerdictKind>(['lock', 'top']);
const OPEN = 4;

function Say({ v, mine }: { v: Verdict; mine: boolean }) {
  const t = teamByRoster(v.rosterId);
  return (
    <div className={`${x.say} ${mine ? x.sayMine : ''}`}>
      <span className={x.sayHead}>
        <span className={x.sayWho}>
          <b>{t?.teamName ?? v.manager}</b>
          <small>{mine ? `${v.manager} · You` : v.manager}</small>
        </span>
        <span className={`${x.chip} ${HOT.has(v.kind) ? x.hot : GOOD.has(v.kind) ? x.good : ''}`}>{LABELS[v.kind]}</span>
      </span>
      <p>{v.saying.replace(/(\w)'(\w)/g, '$1’$2')}</p>
    </div>
  );
}

/** Squirt's read on every lineup, yours first, the fixable mistakes next; the rest folded. */
export function Verdicts({ verdicts, mine }: { verdicts: Verdict[]; mine: number | null }) {
  const yours = verdicts.find((v) => v.rosterId === mine);
  const ordered = yours ? [yours, ...verdicts.filter((v) => v !== yours)] : verdicts;
  const shown = ordered.slice(0, OPEN);
  const folded = ordered.slice(OPEN);
  return (
    <div className={x.says}>
      {shown.map((v) => (
        <Say key={v.rosterId} v={v} mine={v.rosterId === mine} />
      ))}
      {folded.length ? (
        <details className={x.more}>
          <summary>
            <span className={x.moreShut}>{folded.length} more</span>
            <span className={x.moreOpen}>Show fewer</span>
          </summary>
          {folded.map((v) => (
            <Say key={v.rosterId} v={v} mine={false} />
          ))}
        </details>
      ) : null}
    </div>
  );
}

/** League starters in one NFL game: how many, and yours by name. */
export function startersIn(games: Game[], abbrs: string[], mine: number | null) {
  const want = new Set(abbrs);
  let count = 0;
  const yours: string[] = [];
  for (const g of games)
    for (const side of [g.away, g.home])
      for (const p of side.lineup) {
        if (!p.team || !want.has(p.team)) continue;
        count++;
        if (side.rosterId === mine) yours.push(shortName(p.name, p.position, p.team));
      }
  return { count, yours };
}

function NflRow({ side, game, lost, implied }: { side: NflSide; game: NflGame; lost: boolean; implied: number | null }) {
  return (
    <span className={`${x.ntRow} ${lost ? x.ntLost : ''}`}>
      <span className={s.tile} style={{ ['--tc' as string]: side.color ?? '#5a616d' }}>
        <img src={side.logo} alt="" loading="lazy" />
      </span>
      <span className={x.ntName}>
        {side.name}
        {side.record ? <small>{side.record}</small> : null}
        {game.state === 'in' && game.possession === side.abbr ? (
          <>
            <Ms name="football" className={x.ntBall} />
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>has the ball</span>
          </>
        ) : null}
        {game.state === 'pre' && implied != null ? <small>Implied {implied.toFixed(1)}</small> : null}
      </span>
      {game.state === 'pre' ? <span /> : <span className={x.ntScore}>{side.score ?? 0}</span>}
    </span>
  );
}

/**
 * One NFL game on the slate: the clock or the kickoff and the network, both
 * clubs with record and score, the win chance (the book before kickoff,
 * ESPN's model during), the spread and total, and who in this league is in it.
 */
export function SlateTile({
  game,
  lines,
  starters,
  yours,
  lineBook,
  week,
}: {
  game: NflGame;
  lines?: GameLines;
  starters: number;
  yours: string[];
  lineBook: string | null;
  week: number;
}) {
  const awayWin = lines?.liveHomeWin != null && game.state === 'in' ? 1 - lines.liveHomeWin : (lines?.away.implied ?? null);
  const a = game.away.score ?? 0;
  const h = game.home.score ?? 0;
  const post = game.state === 'post';
  return (
    <Link href={`/lab/app/nfl/${game.id}?week=${week}`} className={x.nt} aria-label={`${game.away.name} at ${game.home.name}`}>
      <span className={x.ntHead}>
        <span>{game.state === 'in' ? <LiveChip text={quarter(game.period, game.clock)} /> : post ? 'Final' : kickoffText(game.kickoff)}</span>
        <span>{game.broadcast ?? ''}</span>
      </span>
      <NflRow side={game.away} game={game} lost={post && a < h} implied={impliedTeamTotal(lines, false)} />
      <NflRow side={game.home} game={game} lost={post && h < a} implied={impliedTeamTotal(lines, true)} />
      {awayWin != null && !post ? <WinBar first={awayWin} caption={game.state === 'in' ? 'Live win chance' : 'Implied by the line'} /> : null}
      <span className={x.ntFoot}>
        {game.state === 'in' && game.situation ? (
          <span>{game.situation}</span>
        ) : lines && (lines.details || lines.overUnder != null) && !post ? (
          <span className={x.ntPairs}>
            {lines.details ? (
              <span>
                Spread <b>{lines.details}</b>
              </span>
            ) : null}
            {lines.overUnder != null ? (
              <span>
                Total <b>{lines.overUnder}</b>
              </span>
            ) : null}
            {lines.provider !== lineBook ? (
              <span>
                Book <b>{lines.provider}</b>
              </span>
            ) : null}
          </span>
        ) : (
          <span />
        )}
        {starters ? <span className={x.chip}>{starters} league {starters === 1 ? 'starter' : 'starters'}</span> : null}
        {yours.length ? (
          <span className={x.ntYours} style={{ flexBasis: '100%' }}>
            Yours {yours.map((n) => <b key={n}>{n}</b>)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

const ORDER = { in: 0, pre: 1, post: 2 } as const;
const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Chicago' });

/** The NFL week: live games first, then each day's kickoffs, then the finals. */
export function Slate({
  games,
  lines,
  leagueGames,
  mine,
  lineBook,
  week,
}: {
  games: NflGame[];
  lines: Record<string, GameLines>;
  leagueGames: Game[];
  mine: number | null;
  lineBook: string | null;
  week: number;
}) {
  if (!games.length) return <p className={s.empty}>No NFL games on ESPN&rsquo;s slate for week {week}.</p>;
  const sorted = [...games].sort((p, q) => ORDER[p.state] - ORDER[q.state] || p.kickoff.localeCompare(q.kickoff));
  const groups: { head: string; list: NflGame[] }[] = [];
  for (const g of sorted) {
    const head = g.state === 'in' ? 'Live' : g.state === 'post' ? 'Final' : DAY.format(new Date(g.kickoff));
    const last = groups[groups.length - 1];
    if (last && last.head === head) last.list.push(g);
    else groups.push({ head, list: [g] });
  }
  return (
    <div className={x.games}>
      {groups.map((grp) => (
        <div key={grp.head} className={x.games}>
          {grp.head !== 'Live' && grp.head !== 'Final' ? <span className={x.dayHead}>{grp.head}</span> : null}
          {grp.list.map((g) => {
            const st = startersIn(leagueGames, [g.away.abbr, g.home.abbr], mine);
            return <SlateTile key={g.id} game={g} lines={lines[g.id]} starters={st.count} yours={st.yours} lineBook={lineBook} week={week} />;
          })}
        </div>
      ))}
    </div>
  );
}
