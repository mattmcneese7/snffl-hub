import Link from 'next/link';
import { statWords } from '../../kit/statWords';
import { CaretDown } from '@phosphor-icons/react/dist/ssr';
import { LivePlayerPoints } from '@/components/LiveScores';
import { moneyText } from '../../lib/book-pref';
import type { LiveMatchup, LivePlayer, LiveSide } from '@/lib/matchup-live';
import { kickoff, pts, quarter } from './shared';
import s from '../sb.module.css';

/**
 * Starters head to head, v2's MatchupLineup in Pool. Each row is faces,
 * full names and points, with the slot between the two scores so a row
 * compares like for like, and under each face, with nothing to tap: his
 * game, his stat line (projected line before kickoff), the book's line on
 * his game, and DraftSharks' floor to ceiling with a dot for the points so
 * far. The bench folded below. Totals live on the score card above, once.
 */

const INJURY_SHORT: Record<string, string> = { Questionable: 'Q', Doubtful: 'D', Out: 'OUT', IR: 'IR', PUP: 'PUP', Sus: 'SUS', NA: 'NA' };

/** "vs DET, W 41-31", "at NO, Sun 12 PM" or "at NO, Q3 4:12". */
function gameLine(p: LivePlayer): string {
  if (!p.nfl) return p.team ? 'Bye week' : 'Free agent';
  const { game, opponent, home, team } = p.nfl;
  const where = `${home ? 'vs' : 'at'} ${opponent.abbr}`;
  if (game.state === 'pre') return `${where}, ${kickoff(game.kickoff)}`;
  if (game.state === 'in') return `${where}, ${quarter(game.period, game.clock)}`;
  const mine = team.score ?? 0;
  const theirs = opponent.score ?? 0;
  return `${where}, ${mine > theirs ? 'W' : mine < theirs ? 'L' : 'T'} ${mine}-${theirs}`;
}

/**
 * The book on his game, in words: spread, total, his team's implied total and
 * moneyline. The widget's source line names the main book; a line from any
 * other book (the pick had none) names its own.
 */
function lineFacts(p: LivePlayer, lineBook: string | null): [string, string][] {
  const lines = p.lines;
  if (!p.nfl || !lines || p.nfl.game.state === 'post') return [];
  const out: [string, string][] = [];
  if (lines.details) out.push(['Spread', lines.details]);
  if (lines.overUnder != null) out.push(['Total', String(lines.overUnder)]);
  if (p.teamTotal != null) out.push(['Implied', String(p.teamTotal)]);
  // A book's American price, or Polymarket's win price as a percent.
  const money = moneyText(lines, p.nfl.home);
  if (money) out.push(['Moneyline', money]);
  if (out.length && lines.provider !== lineBook) out.push(['Book', lines.provider]);
  return out;
}

function Range({ p }: { p: LivePlayer }) {
  const ds = p.ds;
  if (!ds || ds.floor == null || ds.ceiling == null) return <span className={s.rangeNote}>No DraftSharks range</span>;
  // One scale for every row, so bars compare down the table.
  const max = Math.max(40, ds.ceiling * 1.1, p.points * 1.05);
  const at = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <>
      <span className={s.range} role="img" aria-label={`DraftSharks range ${ds.floor} to ${ds.ceiling}, ${p.points.toFixed(1)} so far`}>
        <span className={s.rangeBand} style={{ left: `${at(ds.floor)}%`, width: `${at(ds.ceiling) - at(ds.floor)}%` }} />
        {p.gameState !== 'pre' ? <span className={`${s.rangeDot} ${p.points >= ds.floor ? s.rangeHit : ''}`} style={{ left: `${at(p.points)}%` }} /> : null}
      </span>
      <span className={s.rangeNote}>
        Range {ds.floor.toFixed(1)} to {ds.ceiling.toFixed(1)}
      </span>
    </>
  );
}

function Who({ p, right }: { p?: LivePlayer; right?: boolean }) {
  if (!p) return <span />;
  const injury = p.injury ? (INJURY_SHORT[p.injury] ?? p.injury) : null;
  const isDef = p.position === 'DEF';
  return (
    <Link href={`/players/${p.id}`} className={`${s.id} ${right ? s.idRight : ''}`}>
      <span className={`${s.luFace} ${isDef ? s.luFaceLogo : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.headshot} alt="" loading="lazy" />
        {p.nfl && !isDef ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.nfl.team.logo} alt="" loading="lazy" className={s.badge} />
        ) : null}
      </span>
      <span className={s.luName}>
        {p.name}
        {injury ? <span className={s.injury}>{injury}</span> : null}
      </span>
    </Link>
  );
}

function Points({ p, win, side, week }: { p?: LivePlayer; win: boolean; side: 'away' | 'home'; week: number }) {
  return (
    <span className={`${s.pts} ${side === 'away' ? s.ptsAway : s.ptsHome} ${win ? s.ptsWin : ''}`}>
      {/* A dash until his game kicks off: Sleeper's 0 before then is not a score. */}
      {p && p.gameState !== 'pre' ? (
        <LivePlayerPoints playerId={p.id} week={week} fallback={p.points} className={s.ptsVal} />
      ) : (
        <span className={`${s.ptsVal} ${s.ptsWait}`}>&ndash;</span>
      )}
      {p?.projected != null ? <span className={s.ptsProj}>{p.projected.toFixed(1)}</span> : null}
    </span>
  );
}

/**
 * Everything v2 hid behind a tap, up front under the face: his position and
 * game (score state or kickoff), his stat line (projected line before
 * kickoff), the chosen book's line on his game, and the DraftSharks range.
 */
function Info({ p, right, lineBook }: { p?: LivePlayer; right?: boolean; lineBook: string | null }) {
  if (!p) return <span className={s.infoCell} />;
  const line = statWords(p.gameState === 'pre' || !p.statLine ? p.projectedLine : p.statLine);
  const odds = lineFacts(p, lineBook);
  return (
    <span className={`${s.info} ${s.infoCell} ${right ? s.infoRight : ''} ${right ? s.infoHome : s.infoAway}`}>
      <span className={s.infoGame}>
        {p.gameState === 'in' ? <span className={s.liveDot} aria-label="Playing now" /> : null}
        {p.position}, {gameLine(p)}
      </span>
      {line ? (
        <span className={p.gameState === 'pre' ? s.infoProj : undefined}>
          {p.gameState === 'pre' ? 'Projected ' : ''}
          {line}
        </span>
      ) : null}
      {odds.length ? (
        <span className={s.infoOdds}>
          {odds.map(([label, value]) => (
            <span key={label}>
              <b>{label}</b> {value}
            </span>
          ))}
        </span>
      ) : null}
      <Range p={p} />
    </span>
  );
}

function Rows({
  away,
  home,
  bench,
  week,
  lineBook,
}: {
  away: LivePlayer[];
  home: LivePlayer[];
  bench?: boolean;
  week: number;
  lineBook: string | null;
}) {
  const n = Math.max(away.length, home.length);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = away[i];
        const h = home[i];
        const aWin = !!a && !!h && a.gameState !== 'pre' && a.points > h.points;
        const hWin = !!a && !!h && h.gameState !== 'pre' && h.points > a.points;
        return (
          <div className={`${s.row} ${s.rowMain}`} key={`${bench ? 'b' : 's'}-${i}`}>
            <Who p={a} />
            <Points p={a} win={aWin} side="away" week={week} />
            <span className={s.slot}>{bench ? 'BN' : (a?.slot ?? h?.slot ?? '')}</span>
            <Points p={h} win={hWin} side="home" week={week} />
            <Who p={h} right />
            <Info p={a} lineBook={lineBook} />
            <Info p={h} right lineBook={lineBook} />
          </div>
        );
      })}
    </>
  );
}

export default function Lineups({
  matchup,
  names,
  lineBook = null,
}: {
  matchup: LiveMatchup;
  names: [string, string];
  /** The book the widget's source line names. */
  lineBook?: string | null;
}) {
  const { away, home } = matchup;
  const week = matchup.game.week;
  const benchPoints = (side: LiveSide) => side.bench.reduce((sum, p) => sum + p.points, 0);
  return (
    <>
      {/* No names over the columns and no legend: the score card above says
          who is facing whom, and the columns keep its order. */}
      <div className={s.lineup}>
        <Rows away={away.lineup} home={home.lineup} week={week} lineBook={lineBook} />
        {away.bench.length || home.bench.length ? (
          <details className={s.bench}>
            <summary>
              <span>Bench</span>
              <span className={s.benchPts}>
                {pts(benchPoints(away))} and {pts(benchPoints(home))}
              </span>
              <CaretDown weight="bold" className={s.caret} aria-hidden />
            </summary>
            <Rows away={away.bench} home={home.bench} bench week={week} lineBook={lineBook} />
          </details>
        ) : null}
      </div>
    </>
  );
}
