import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ESPN_CUTOUT, ESPN_TEAM_LOGO } from '@/lib/espn';
import { getWeekGames, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import type { LiveMatchup, LivePlayer, LiveSide } from '@/lib/matchup-live';
import { sleeperLink } from '@/lib/sleeper-links';
import { swamiLine, swamiRead } from '@/lib/swami';
import { embedClipsForPlayers } from '../../../lib/embed-clips';
import { moneyText } from '../../../lib/book-pref';
import { bookFrom, mainBook, withBook } from '../../../lib/odds-books';
import { loreTable, type Lore } from '../../../scoreboard/parts/lore';
import { getV4Data, sleeperWinProb, type GameView, type SideView } from '../data';
import Shell, { SectionHead } from '../Shell';
import { LivePoints, LiveStart } from '../live/Live';
import Clips from '../scores/Clips';
import { railOf } from '../scores/clipData';
import { kickoffText, LoreChips, record, Slate } from '../scores/parts';
import { weekView } from '../scores/weekData';
import s from '../v4.module.css';
import x from '../scores/scores.module.css';
import { Ms } from '../icons';

export const metadata: Metadata = { title: { absolute: 'Matchup, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const shortName = (name: string, position: string, team?: string) => {
  if (position === 'DEF') return team ?? name;
  const [first, ...rest] = name.split(' ');
  if (!rest.length || first.includes('.')) return name;
  return `${first[0]}. ${rest.join(' ')}`;
};

/** "L 21-35 vs LAR" once played, "Sun 12:00 PM @ NYJ" before, as Sleeper prints them. */
function resultOf(p: LivePlayer): { text: string; wl: 'W' | 'L' | null } {
  const g = p.nfl;
  if (!g) return { text: p.gameState === 'bye' ? 'Bye' : '', wl: null };
  const where = `${g.home ? 'vs' : '@'} ${g.opponent.abbr}`;
  if (g.game.state === 'pre') return { text: `${kickoffText(g.game.kickoff)} ${where}`, wl: null };
  const us = g.team.score ?? 0;
  const them = g.opponent.score ?? 0;
  if (g.game.state === 'in') return { text: `${us}-${them} ${where} · ${g.game.status}`, wl: null };
  return { text: `${us}-${them} ${where}`, wl: us > them ? 'W' : 'L' };
}

function Player({ p, right, wk }: { p: LivePlayer; right?: boolean; wk?: number }) {
  const r = resultOf(p);
  const pre = p.gameState === 'pre';
  return (
    <button type="button" data-player={p.id} className={`${s.plTap} ${s.pl} ${right ? s.r : ''}`} aria-label={`${p.name}, open player`}>
      <span className={s.plTop}>
        <span className={s.face}>
          {p.position === 'DEF' && p.team ? <img src={ESPN_TEAM_LOGO(p.team)} alt="" style={{ objectFit: 'contain', padding: 4 }} /> : <img src={p.headshot} alt="" />}
          {p.position !== 'DEF' && p.team ? (
            <span>
              <img src={ESPN_TEAM_LOGO(p.team)} alt="" />
            </span>
          ) : null}
        </span>
        <span className={s.pts}>
          <b>{pre ? '–' : wk ? <LivePoints week={wk} playerId={p.id} fallback={p.points} /> : p.points.toFixed(2)}</b>
          <small>Proj {(p.projected ?? 0).toFixed(2)}</small>
        </span>
      </span>
      <b className={s.plName}>{shortName(p.name, p.position, p.team)}</b>
      <span className={s.plMeta}>
        {r.wl ? <b className={r.wl === 'W' ? s.win : s.loss}>{r.wl} </b> : null}
        {r.text}
      </span>
      {!pre && p.statLine ? <span className={s.plLine}>{p.statLine}</span> : null}
    </button>
  );
}

/** Top Performers: a ticket in the team's color, the box score on the strip. */
function Ticket({ p, owner }: { p: LivePlayer; owner: string }) {
  const color = p.nfl?.team.color ?? '#2d4c9c';
  const r = resultOf(p);
  return (
    <button type="button" data-player={p.id} className={s.tk} style={{ ['--tk' as string]: darken(color) }} aria-label={`${p.name}, open player`}>
      {p.team ? <img className={s.tkLogo} src={ESPN_TEAM_LOGO(p.team)} alt="" /> : null}
      <span className={s.tkCut}>{p.espnId ? <img src={ESPN_CUTOUT(p.espnId)} alt="" /> : <img src={p.headshot} alt="" />}</span>
      <span className={s.tkMid}>
        <b>{shortName(p.name, p.position, p.team)}</b>
        <span>
          {p.position} &middot; {owner}
        </span>
        <em>{r.wl ? `${r.wl} ${r.text}` : r.text}</em>
      </span>
      <span className={s.tkPts}>
        <b>{p.points.toFixed(2)}</b>
        <small>Proj {(p.projected ?? 0).toFixed(2)}</small>
      </span>
      <span className={s.tkStrip}>{p.statLine || 'Yet to play'}</span>
    </button>
  );
}

/** Darken a team color until white text clears 4.6:1. */
function darken(hex: string): string {
  const lum = (c: number[]) => {
    const f = (v: number) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  let c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  for (let k = 0; k < 12 && 1.05 / (lum(c) + 0.05) < 4.6; k++) c = c.map((v) => Math.round(v * 0.88));
  return `rgb(${c.join(',')})`;
}

/** Next Game: the NFL game your earliest remaining starter plays in, with logo tiles and venue chips. */
function NextGame({ players, week }: { players: LivePlayer[]; week: number }) {
  const pre = players.filter((p) => p.gameState === 'pre' && p.nfl).sort((a, b) => (a.nfl!.game.kickoff < b.nfl!.game.kickoff ? -1 : 1));
  const first = pre[0];
  if (!first?.nfl) return null;
  const g = first.nfl.game;
  const inIt = pre.filter((p) => p.nfl?.game.id === g.id);
  const lines = first.lines;
  const side = (t: typeof g.home) => (
    <span className={s.ngT}>
      <span className={s.tile} style={{ ['--tc' as string]: t.color ?? '#5a616d' }}>
        <img src={t.logo} alt="" />
      </span>
      <span>{t.name}</span>
      <span className={s.ngR}>{t.record ?? ''}</span>
    </span>
  );
  return (
    <Link href={`/lab/app/nfl/${g.id}?week=${week}`} className={s.ng} aria-label="Next game" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div className={s.ngTop}>
        <span>
          {g.status}
          {g.broadcast ? ` · ${g.broadcast}` : ''}
        </span>
        <span>{[lines?.details, lines?.overUnder ? `O/U ${lines.overUnder}` : null].filter(Boolean).join(' \u00b7 ')}</span>
      </div>
      {side(g.away)}
      {side(g.home)}
      {g.venue ? (
        <div className={s.venue}>
          <i>{g.venue}</i>
        </div>
      ) : null}
      <div className={s.ngYou}>
        <span>In this game</span>
        {inIt.map((p) => (
          <b key={p.id}>{shortName(p.name, p.position, p.team)}</b>
        ))}
      </div>
    </Link>
  );
}

function HeroRow({ side, lost, wk }: { side: SideView; lost: boolean; wk?: number }) {
  return (
    <div className={`${s.heroRow} ${lost ? s.heroLost : ''}`}>
      <span className={s.av} style={{ width: 34, height: 34, ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" /> : null}
      </span>
      <span className={s.heroWho}>
        <b>{side.team}</b>
        <small>{side.manager}</small>
      </span>
      <span className={s.heroScore}>{wk ? <LivePoints week={wk} rosterId={side.rosterId} fallback={side.score} /> : side.score.toFixed(2)}</span>
    </div>
  );
}

const INJURY: Record<string, string> = { Questionable: 'Q', Doubtful: 'D', Out: 'OUT', IR: 'IR', PUP: 'PUP', Sus: 'SUS', NA: 'NA' };

/** The book on his game: spread, total, his team's implied total, moneyline. */
function lineFacts(p: LivePlayer): [string, string][] {
  const l = p.lines;
  if (!p.nfl || !l || p.nfl.game.state === 'post') return [];
  const out: [string, string][] = [];
  if (l.details) out.push(['Spread', l.details]);
  if (l.overUnder != null) out.push(['Total', String(l.overUnder)]);
  if (p.teamTotal != null) out.push(['Implied', String(p.teamTotal)]);
  const ml = moneyText(l, p.nfl.home);
  if (ml) out.push(['ML', ml]);
  return out;
}

/** DraftSharks' floor to ceiling, one scale for every row, a dot for the points so far. */
function Range({ p }: { p: LivePlayer }) {
  const ds = p.ds;
  if (!ds || ds.floor == null || ds.ceiling == null) return <span>No DraftSharks range</span>;
  const max = Math.max(40, ds.ceiling * 1.1, p.points * 1.05);
  const at = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <>
      <span className={x.rg} role="img" aria-label={`Range ${ds.floor} to ${ds.ceiling}`}>
        <span className={x.rgBand} style={{ left: `${at(ds.floor)}%`, width: `${at(ds.ceiling) - at(ds.floor)}%` }} />
        {p.gameState !== 'pre' ? <span className={`${x.rgDot} ${p.points >= ds.floor ? x.rgHit : ''}`} style={{ left: `${at(p.points)}%` }} /> : null}
      </span>
      <span>
        Range <b>{ds.floor.toFixed(1)}</b> to <b>{ds.ceiling.toFixed(1)}</b>
      </span>
    </>
  );
}

/**
 * What a slot row opens to, past what the card already shows: his projected
 * line before kickoff, the book on his game, any injury tag, and the range.
 */
function Info({ p, right }: { p?: LivePlayer; right?: boolean }) {
  if (!p) return <span />;
  const odds = lineFacts(p);
  return (
    <span className={`${x.info} ${right ? x.infoR : ''}`}>
      {p.injury ? (
        <span>
          Status <span className={x.injury}>{INJURY[p.injury] ?? p.injury}</span>
        </span>
      ) : null}
      {p.gameState === 'pre' && p.projectedLine ? <span>Proj {p.projectedLine}</span> : null}
      {odds.length ? (
        <span>
          {odds.map(([k, v], i) => (
            <span key={k} style={{ display: 'inline' }}>
              {i ? ' · ' : ''}
              {k} <b>{v}</b>
            </span>
          ))}
        </span>
      ) : null}
      <Range p={p} />
    </span>
  );
}

/** One slot head to head; the row opens for both sides' games, lines and ranges. */
function SlotRow({ me, them, label, wk }: { me?: LivePlayer; them?: LivePlayer; label: string; wk?: number }) {
  return (
    <details className={x.xp}>
      <summary>
        <div className={s.slot}>
          {me ? <Player p={me} wk={wk} /> : <span />}
          <span className={x.slotCol}>
            <span className={s.slotChip} style={{ marginTop: 0 }}>{label}</span>
            <Ms name="next" size={20} className={x.caret} />
          </span>
          {them ? <Player p={them} right wk={wk} /> : <span />}
        </div>
      </summary>
      <div className={x.xpBody}>
        <Info p={me} />
        <Info p={them} right />
      </div>
    </details>
  );
}

/** The Swami's read on the game: who is favored, the gap, who still decides it, the matchups worth naming. */
function Swami({ live }: { live: LiveMatchup }) {
  const named = (side: LiveSide): LiveSide => ({ ...side, manager: teamByRoster(side.rosterId)?.teamName ?? side.team });
  const read = swamiRead({ ...live, away: named(live.away), home: named(live.home) });
  const line = swamiLine(read);
  if (read.settled || !line) return null;
  const max = Math.max(...read.swing.map((w) => w.leverage), 1);
  return (
    <>
      <div className={s.title}>
        <h2>The Swami</h2>
        <Link href="/lab/app/swami">Research</Link>
      </div>
      <section className={x.sw}>
        <p className={x.swRead}>{line}</p>
        {read.path ? (
          <div className={x.swBlock}>
            <span className={x.swLabel}>The gap</span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {read.path.need} to find, {read.path.upside} available from {read.path.players.length} still to play
            </span>
          </div>
        ) : null}
        {read.swing.length ? (
          <div className={x.swBlock}>
            <span className={x.swLabel}>Still deciding it</span>
            {read.swing.map((w) => (
              <button key={w.player.id} type="button" data-player={w.player.id} className={`${s.plTap} ${x.lev}`} aria-label={`${w.player.name}, open player`}>
                <span className={x.levWho}>
                  <b>{shortName(w.player.name, w.player.position, w.player.team)}</b>
                  <small>{w.manager}</small>
                </span>
                <span className={x.levTrack} aria-hidden>
                  <span style={{ width: `${Math.round((w.leverage / max) * 100)}%` }} />
                </span>
                <span className={x.levNum}>{w.leverage.toFixed(1)}</span>
              </button>
            ))}
          </div>
        ) : null}
        {read.edges.length ? (
          <div className={x.swBlock}>
            <span className={x.swLabel}>Matchups</span>
            <span className={x.chipRow}>
              {read.edges.map((e) => (
                <span key={e.player.id} className={`${s.tag} ${e.matchup!.label === 'hard' ? s.tagBad : e.matchup!.label === 'soft' ? s.tagGood : ''}`}>
                  {shortName(e.player.name, e.player.position, e.player.team)} {e.matchup!.label} vs {e.matchup!.opponent}
                </span>
              ))}
            </span>
            {read.confidence === 'thin' ? <span className={x.via}>Two games of defensive data so far, a nudge, not a verdict</span> : null}
          </div>
        ) : null}
      </section>
    </>
  );
}

/** Head to head: each team's record and lore, and the last time these two met. */
function HeadToHead({ a, b, lore, lastMet }: { a: SideView; b: SideView; lore: (r: number) => Lore; lastMet: string | null }) {
  return (
    <section className={x.h2h} aria-label="Head to head">
      {[a, b].map((side) => (
        <div key={side.rosterId} className={x.h2hRow}>
          <span className={`${s.av} ${x.avSm}`} style={{ ['--mgr' as string]: side.color }}>
            {side.avatar ? <img src={side.avatar} alt="" loading="lazy" /> : null}
          </span>
          <span className={x.h2hWho}>
            <b>{side.team}</b>
            <small>
              {side.manager} &middot; {record(side.rosterId)}
            </small>
            <LoreChips lore={lore(side.rosterId)} max={4} />
          </span>
        </div>
      ))}
      <div className={x.h2hMet}>{lastMet ?? 'First meeting this season'}</div>
    </section>
  );
}

/** The last time these two rosters met this season, before this week. */
async function lastMeeting(week: number, a: number, b: number): Promise<string | null> {
  for (let w = week - 1; w >= 1; w--) {
    const past = await getWeekGames(w).catch(() => []);
    const g = past.find((q) => [q.away.rosterId, q.home.rosterId].includes(a) && [q.away.rosterId, q.home.rosterId].includes(b));
    if (g && g.status === 'final') {
      const [win, lose] = g.away.points >= g.home.points ? [g.away, g.home] : [g.home, g.away];
      return `Last met week ${w}: ${teamByRoster(win.rosterId)?.teamName ?? win.team} won ${win.points.toFixed(2)} to ${lose.points.toFixed(2)}`;
    }
  }
  return null;
}

/**
 * A matchup, any week: the two teams large on brand blue, the ways out to
 * Sleeper, every slot head to head (each opens for the game, the line and
 * the range), the bench, Top Performers, the Swami's read, head to head,
 * the next kickoff, the NFL games in play, and the tape.
 */
export default async function V4Matchup({ searchParams }: { searchParams: Promise<{ id?: string; week?: string }> }) {
  const q = await searchParams;
  const jar = await cookies();
  const mineId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mineId);
  const askedWeek = Number(q.week);
  const week = Number.isInteger(askedWeek) && askedWeek >= 1 && askedWeek <= 18 ? askedWeek : data.week;
  const [wv, lore] = await Promise.all([weekView(week, mineId, data), loreTable()]);
  const asked = Number(q.id);
  const other: GameView | undefined = Number.isInteger(asked) ? wv.all.find((g) => g.id === asked) : undefined;
  const mine = other ?? wv.mine;
  const base = mine ? wv.live.get(mine.id) : undefined;

  if (!mine || !base) {
    return (
      <Shell data={data} active="scores">
        <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} />
        <p className={s.empty}>
          Pick your team to see your matchup. <Link href="/lab/app/account">Account</Link>
        </p>
      </Shell>
    );
  }

  // Every line on the page from the book this device picked.
  const ctx = await withBook(wv.ctx, bookFrom(jar)).catch(() => wv.ctx);
  const live = base;
  const meSide = live.away.rosterId === mine.a.rosterId ? live.away : live.home;
  const themSide = meSide === live.away ? live.home : live.away;
  const p = sleeperWinProb(meSide.points, meSide.expected, themSide.points, themSide.expected);
  const pct = Math.round(p * 100);
  const state = wv.state;
  const final = state === 'final' || live.game.status === 'final';
  const yet = themSide.lineup.filter((y) => y.gameState === 'pre');
  const chip = state === 'live' && !final ? 'Live' : final ? 'Final' : 'Preview';
  // Scores tick in place only while this week is being played.
  const wk = chip === 'Live' ? week : undefined;
  const isMine = mine.a.rosterId === mineId;

  const ids = [...meSide.lineup, ...meSide.bench, ...themSide.lineup, ...themSide.bench].map((y) => y.id);
  const owner = new Map<string, string>();
  for (const side of [meSide, themSide]) for (const y of [...side.lineup, ...side.bench]) owner.set(y.id, teamByRoster(side.rosterId)?.teamName ?? side.team);
  const [clips, lastMet] = await Promise.all([embedClipsForPlayers(week, ids).catch(() => []), lastMeeting(week, mine.a.rosterId, mine.b.rosterId)]);
  const rail = railOf(clips, (id) => owner.get(id) ?? null, 8);

  const inGames = new Set([...meSide.lineup, ...themSide.lineup].map((y) => y.nfl?.game.id).filter(Boolean));
  const relevant = ctx.nfl.filter((g) => inGames.has(g.id));
  const lineBook = mainBook(relevant.map((g) => ctx.lines[g.id]));
  const benchPts = (side: LiveSide) => side.bench.reduce((sum, y) => sum + y.points, 0);
  const rows = Math.max(meSide.bench.length, themSide.bench.length);

  return (
    <Shell data={data} active="scores">
      <LiveStart live={ctx.nfl.some((g) => g.state === 'in')} week={week} />
      <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/scores/${week}`, label: `Week ${week} Scores` }} />
      <section className={s.hero} aria-label={`Week ${week} matchup`}>
        <div className={s.heroTop}>
          <span>{isMine ? `Week ${week} Matchup` : `Week ${week}`}</span>
          <span className={chip === 'Live' ? s.liveChip : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {chip === 'Live' ? <i className={s.liveDot} aria-hidden /> : null}
            {chip}
          </span>
        </div>
        <HeroRow side={mine.a} lost={mine.a.lost} wk={wk} />
        <HeroRow side={mine.b} lost={mine.b.lost} wk={wk} />
        {final ? (
          <div className={s.heroWin}>{mine.a.lines[0]}</div>
        ) : (
          <div className={s.heroWin}>
            <i>
              <u style={{ width: `${pct}%` }} />
            </i>
            <span>
              <b>{pct}%</b> to win &middot; Yet to play: {mine.b.manager} ({yet.length}){yet.length ? ` ${yet.map((y) => y.position).join(', ')}` : ''}
            </span>
          </div>
        )}
      </section>
      {!final ? (
        <div className={x.out}>
          <a className={x.outBtn} href={sleeperLink(isMine ? 'lineup' : 'matchup')} target="_blank" rel="noopener noreferrer">
            Open Sleeper
          </a>
        </div>
      ) : null}
      <div className={s.title}>
        <h2>Starters</h2>
      </div>
      <div className={s.starters}>
        <div className={s.stHead}>
          <span className={s.stWho}>
            <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: mine.a.color }}>
              {mine.a.avatar ? <img src={mine.a.avatar} alt="" /> : null}
            </span>
            {mine.a.team}
          </span>
          <span className={s.stVs}>vs</span>
          <span className={`${s.stWho} ${s.r}`}>
            <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: mine.b.color }}>
              {mine.b.avatar ? <img src={mine.b.avatar} alt="" /> : null}
            </span>
            {mine.b.team}
          </span>
        </div>
        {meSide.lineup.map((me, i) => (
          <SlotRow key={`${me.slot}-${i}`} me={me} them={themSide.lineup[i]} label={me.slot === 'SUPER_FLEX' ? 'SF' : me.slot} wk={wk} />
        ))}
      </div>
      {rows ? (
        <details className={x.bench}>
          <summary>
            <span>Bench</span>
            {meSide.bench.concat(themSide.bench).some((y) => y.gameState !== 'pre') ? (
              <span>
                {benchPts(meSide).toFixed(2)} &middot; {benchPts(themSide).toFixed(2)}
              </span>
            ) : (
              <span>
                {meSide.bench.length} &middot; {themSide.bench.length} players
              </span>
            )}
          </summary>
          {Array.from({ length: rows }, (_, i) => (
            <SlotRow key={`bn-${i}`} me={meSide.bench[i]} them={themSide.bench[i]} label="BN" wk={wk} />
          ))}
        </details>
      ) : null}
      {meSide.lineup.concat(themSide.lineup).some((y) => y.gameState !== 'pre') ? (
        <>
          <div className={s.title}>
            <h2>Top Performers</h2>
          </div>
          <div className={s.tks}>
            {[...meSide.lineup.map((y) => ({ p: y, owner: mine.a.team })), ...themSide.lineup.map((y) => ({ p: y, owner: mine.b.team }))]
              .filter(({ p: y }) => y.gameState !== 'pre')
              .sort((m1, m2) => m2.p.points - m1.p.points)
              .slice(0, 3)
              .map(({ p: y, owner: o }) => (
                <Ticket key={y.id} p={y} owner={o} />
              ))}
          </div>
        </>
      ) : null}
      <Swami live={live} />
      <div className={s.title}>
        <h2>Head to Head</h2>
      </div>
      <HeadToHead a={mine.a} b={mine.b} lore={lore} lastMet={lastMet} />
      {meSide.lineup.concat(themSide.lineup).some((y) => y.gameState === 'pre') ? (
        <>
          <div className={s.title}>
            <h2>Next Game</h2>
          </div>
          <NextGame players={meSide.lineup.concat(themSide.lineup)} week={week} />
        </>
      ) : null}
      {relevant.length ? (
        <>
          <div className={s.title}>
            <h2>Their Games</h2>
            <Link href={`/lab/app/nfl?week=${week}`}>Full slate</Link>
          </div>
          <Slate games={relevant} lines={ctx.lines} leagueGames={wv.games} mine={mineId} lineBook={lineBook} week={week} />
        </>
      ) : null}
      {rail.length ? (
        <>
          <div className={s.title}>
            <h2>This Game, on Tape</h2>
          </div>
          <Clips clips={rail} />
        </>
      ) : null}
      <span className={x.via}>Sources: Sleeper, ESPN, DraftSharks{lineBook ? `, ${lineBook}` : ''}, YouTube</span>
    </Shell>
  );
}
