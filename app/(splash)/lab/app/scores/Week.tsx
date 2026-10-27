import Link from 'next/link';
import { cookies } from 'next/headers';
import { lastFantasyWeek } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { sleeperLink } from '@/lib/sleeper-links';
import { leagueVerdicts, oracleFor, type Verdict } from '@/lib/squirt-says';
import { bookFrom, mainBook, slateLines } from '../../../lib/odds-books';
import { loreTable } from '../../../scoreboard/parts/lore';
import { getV4Data, type GameView } from '../data';
import Shell, { SectionHead } from '../Shell';
import { GameCard, LiveChip, Slate, Verdicts } from './parts';
import { shortName, sidesOf, weekView, type WeekView } from './weekData';
import WeekStrip from './WeekStrip';
import { LivePoints, LiveStart } from '../live/Live';
import s from '../v4.module.css';
import x from './scores.module.css';

/** Your game on brand blue: both teams, the odds, who is carrying each side, and the ways into it. */
function YourGame({ g, wv, lore }: { g: GameView; wv: WeekView; lore: Awaited<ReturnType<typeof loreTable>> }) {
  const m = wv.live.get(g.id)!;
  const [me, them] = sidesOf(g, m);

  const final = wv.state === 'final' || m.game.status === 'final';
  const pct = Number(g.a.mark.replace('%', ''));
  const carry = [me, them].map((side) => [...side.lineup].sort((p, q) => q.points - p.points)[0]).filter((p) => p && p.points > 0);
  const chip = m.game.inPlay ? <LiveChip /> : <span>{final ? 'Final' : wv.state === 'preview' ? 'Preview' : 'Live'}</span>;
  return (
    <section className={s.hero} aria-label={`Week ${wv.week} matchup`}>
      <div className={s.heroTop}>
        <span>Week {wv.week} Matchup</span>
        {chip}
      </div>
      {[g.a, g.b].map((side) => (
        <div key={side.rosterId} className={`${s.heroRow} ${side.lost ? s.heroLost : ''}`}>
          <span className={s.av} style={{ width: 34, height: 34, ['--mgr' as string]: side.color }}>
            {side.avatar ? <img src={side.avatar} alt="" /> : null}
          </span>
          <span className={s.heroWho}>
            <b>{side.team}</b>
            <small>{side.manager}</small>
          </span>
          <span className={s.heroScore}>{m.game.inPlay && !final ? <LivePoints week={wv.week} rosterId={side.rosterId} fallback={side.score} /> : side.score.toFixed(2)}</span>
        </div>
      ))}
      <div className={s.heroWin}>
        {!final && Number.isFinite(pct) ? (
          <>
            <i>
              <u style={{ width: `${pct}%` }} />
            </i>
            <span>
              <b>{pct}%</b> to win &middot; {g.a.lines[0]}
            </span>
          </>
        ) : (
          <span>{g.a.lines[0]}</span>
        )}
      </div>
      {carry.length && wv.state !== 'preview' ? (
        <div className={x.heroLines}>
          {carry.map((p, i) => (
            <span key={p!.id}>
              Carrying {i === 0 ? g.a.team : g.b.team}: <b>{shortName(p!.name, p!.position, p!.team)}</b> {p!.points.toFixed(2)}
            </span>
          ))}
        </div>
      ) : null}
      {[...lore(g.a.rosterId), ...lore(g.b.rosterId)].length ? (
        <div className={x.heroChips}>
          {lore(g.a.rosterId)
            .slice(0, 2)
            .map((l) => (
              <span key={`a${l.text}`} className={x.heroChip}>
                {g.a.manager}: {l.text.replace(' | ', ' ')}
              </span>
            ))}
          {lore(g.b.rosterId)
            .slice(0, 2)
            .map((l) => (
              <span key={`b${l.text}`} className={x.heroChip}>
                {g.b.manager}: {l.text.replace(' | ', ' ')}
              </span>
            ))}
        </div>
      ) : null}
      <div className={x.heroFoot}>
        {!final ? (
          <a className={x.heroBtn} href={sleeperLink('lineup')} target="_blank" rel="noopener noreferrer">
            Set Lineup
          </a>
        ) : null}
        <Link className={`${x.heroBtn} ${x.heroBtnSolid}`} href={`/lab/app/matchup?id=${g.id}&week=${wv.week}`}>
          Full matchup
        </Link>
      </div>
    </section>
  );
}

/**
 * The Scores tab: any week of the season. Your game first on blue, then
 * Squirt's read on every lineup while the week is open, every other
 * matchup with its odds and margin, and the NFL games those lineups play in.
 */
export default async function ScoresWeek({ week }: { week?: number }) {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const wk = week ?? data.week;
  const [wv, lore] = await Promise.all([weekView(wk, mine, data), loreTable()]);
  const open = wk === data.week && wv.state !== 'final' && wv.games.some((g) => g.status !== 'final');
  let verdicts: Verdict[] = [];
  if (open) {
    const oracle = await oracleFor(wk).catch(() => null);
    if (oracle) verdicts = leagueVerdicts(oracle.sides, oracle.input);
  }
  const lines = await slateLines(wv.ctx.nfl, wv.ctx.lines, bookFrom(jar)).catch(() => wv.ctx.lines);
  const lineBook = mainBook(Object.values(lines));
  const live = wv.ctx.nfl.some((g) => g.state === 'in');
  // The closest game still being played wears a label of its own.
  const inPlay = wv.others.filter((g) => wv.games.find((x) => x.matchupId === g.id)?.inPlay);
  const closest = inPlay.length ? inPlay.reduce((a, b) => (Math.abs(b.a.score - b.b.score) < Math.abs(a.a.score - a.b.score) ? b : a)) : null;
  // The slate on this page is the part that matters now: live, then the next to kick off.
  const slate = [...wv.ctx.nfl].sort((a, b) => ({ in: 0, pre: 1, post: 2 })[a.state] - ({ in: 0, pre: 1, post: 2 })[b.state] || a.kickoff.localeCompare(b.kickoff)).slice(0, 4);

  return (
    <Shell data={data} active="scores">
      <LiveStart live={live} week={wk} />
      <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} />
      <WeekStrip week={wk} last={lastFantasyWeek()} base="/lab/app/scores" />
      {wv.mine ? (
        <YourGame g={wv.mine} wv={wv} lore={lore} />
      ) : (
        <p className={s.empty}>
          {mine != null ? `No game for your team in week ${wk}.` : 'Pick your team to see your game first.'} {mine == null ? <Link href="/lab/app/account">Account</Link> : null}
        </p>
      )}
      {verdicts.length ? (
        <>
          <div className={s.title}>
            <h2>Squirt Says</h2>
          </div>
          <Verdicts verdicts={verdicts} mine={mine} />
        </>
      ) : null}
      <div className={s.title}>
        <h2>All Matchups</h2>
      </div>
      {wv.others.length ? (
        <div className={x.games}>
          {wv.others.map((g) => (
            <GameCard key={g.id} g={g} m={wv.live.get(g.id)!} game={wv.games.find((q) => q.matchupId === g.id)!} week={wk} state={wv.state} lore={lore} label={g === closest ? 'Closest Game' : undefined} />
          ))}
        </div>
      ) : (
        <p className={s.empty}>No matchups posted for week {wk}.</p>
      )}
      <div className={s.title}>
        <h2>NFL Week {wk}</h2>
        <Link href={`/lab/app/nfl?week=${wk}`}>Full slate</Link>
      </div>
      <Slate games={slate} lines={lines} leagueGames={wv.games} mine={mine} lineBook={lineBook} week={wk} />
      <span className={x.via}>Sources: Sleeper, ESPN{lineBook ? `, ${lineBook}` : ''}, DraftSharks</span>
    </Shell>
  );
}

