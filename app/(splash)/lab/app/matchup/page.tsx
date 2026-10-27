import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ESPN_CUTOUT, ESPN_TEAM_LOGO } from '@/lib/espn';
import { getWeekGames, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import type { LiveMatchup, LivePlayer, LiveSide } from '@/lib/matchup-live';
import { sleeperLink } from '@/lib/sleeper-links';
import { swamiLine, swamiRead } from '@/lib/swami';
import { moneyText } from '../../../lib/book-pref';
import { bookFrom, mainBook, withBook } from '../../../lib/odds-books';
import { getV4Data, sleeperWinProb, type GameView } from '../data';
import Shell, { SectionHead } from '../Shell';
import { LivePoints, LiveStart } from '../live/Live';
import { kickoffText, quarter, record } from '../scores/format';
import type { NflGame } from '@/lib/gameday';
import m from './matchup.module.css';
import { weekView } from '../scores/weekData';
import { Avatar, Card, Chips, Crest, Drawer, Duel, DuelPlayer, DuelRow, Empty, Face, Hero, Label, List, LiveTag, Meter, Pair, Row, Section, Tag, Ticket, ui } from '../ui';

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

/** The box score's lead stat ("6/7 REC, 148 YD") for the summary row; the whole line opens with the row. */
const shortLine = (line: string) => line.split(', ')[0];

/** A player in a duel cell. */
function Player({ p, right, wk }: { p: LivePlayer; right?: boolean; wk?: number }) {
  const r = resultOf(p);
  const pre = p.gameState === 'pre';
  return (
    <DuelPlayer
      id={p.id}
      team={p.team}
      defense={p.position === 'DEF'}
      right={right}
      points={pre ? '–' : wk ? <LivePoints week={wk} playerId={p.id} fallback={p.points} /> : p.points.toFixed(2)}
      proj={(p.projected ?? 0).toFixed(2)}
      name={shortName(p.name, p.position, p.team)}
      line={pre ? r.text : p.statLine ? shortLine(p.statLine) : r.text}
    />
  );
}

/** Next Game: the NFL game your earliest remaining starter plays in. */
function NextGame({ players, week }: { players: LivePlayer[]; week: number }) {
  const pre = players.filter((p) => p.gameState === 'pre' && p.nfl).sort((a, b) => (a.nfl!.game.kickoff < b.nfl!.game.kickoff ? -1 : 1));
  const first = pre[0];
  if (!first?.nfl) return null;
  const g = first.nfl.game;
  const inIt = pre.filter((p) => p.nfl?.game.id === g.id);
  const lines = first.lines;
  const side = (t: typeof g.home) => ({ lead: <Crest src={t.logo} size={28} />, title: t.name, value: <span className={ui.sub}>{t.record ?? ''}</span> });
  const odds = [lines?.details, lines?.overUnder ? `O/U ${lines.overUnder}` : null].filter(Boolean).join(' \u00b7 ');
  return (
    <Section title="Next Game">
      <Card href={`/lab/app/nfl/${g.id}?week=${week}`}>
        <Pair big sides={[side(g.away), side(g.home)]} status={<span>{[g.status, g.broadcast, odds].filter(Boolean).join(' \u00b7 ')}</span>} />
        {g.venue ? (
          <Chips label="Venue">
            <Tag>{g.venue}</Tag>
          </Chips>
        ) : null}
        <span className={ui.sub}>In this game: {inIt.map((p) => shortName(p.name, p.position, p.team)).join(', ')}</span>
      </Card>
    </Section>
  );
}

/** One NFL game in a line: both crests, the score or the kickoff, how many of each side's starters play in it. */
function GameLine({ g, week, sides, counts }: { g: NflGame; week: number; sides: string[]; counts: number[] }) {
  const pre = g.state === 'pre';
  return (
    <Row
      href={`/lab/app/nfl/${g.id}?week=${week}`}
      lead={
        <span className={m.crests}>
          <Crest src={g.away.logo} size={28} />
          <Crest src={g.home.logo} size={28} />
        </span>
      }
      title={pre ? `${g.away.abbr} at ${g.home.abbr}` : `${g.away.abbr} ${g.away.score ?? 0}, ${g.home.abbr} ${g.home.score ?? 0}`}
      sub={`${sides.map((name, i) => `${name} ${counts[i]}`).join(' · ')} starting`}
      valueSub={pre ? kickoffText(g.kickoff) : g.state === 'in' ? quarter(g.period, g.clock) : 'Final'}
    />
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
      <span className={ui.range} role="img" aria-label={`Range ${ds.floor} to ${ds.ceiling}`}>
        <span className={ui.rangeBand} style={{ left: `${at(ds.floor)}%`, width: `${at(ds.ceiling) - at(ds.floor)}%` }} />
        {p.gameState !== 'pre' ? <span className={`${ui.rangeDot} ${p.points >= ds.floor ? ui.rangeHit : ''}`} style={{ left: `${at(p.points)}%` }} /> : null}
      </span>
      <span>
        Range <b>{ds.floor.toFixed(1)}</b> to <b>{ds.ceiling.toFixed(1)}</b>
      </span>
    </>
  );
}

/**
 * What a slot row opens to, past what the card already shows: the full box
 * score, his projected
 * line before kickoff, the book on his game, any injury tag, and the range.
 */
function Info({ p, right }: { p?: LivePlayer; right?: boolean }) {
  if (!p) return <span />;
  const odds = lineFacts(p);
  const r = resultOf(p);
  return (
    <span className={`${ui.info} ${right ? ui.infoR : ''}`}>
      {p.statLine && shortLine(p.statLine) !== p.statLine ? <span>{p.statLine}</span> : null}
      {p.gameState !== 'pre' && r.text ? <span>{r.wl ? `${r.wl} ${r.text}` : r.text}</span> : null}
      {p.injury ? (
        <span>
          Status <span className={ui.injury}>{INJURY[p.injury] ?? p.injury}</span>
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
    <DuelRow
      slot={label}
      left={me ? <Player p={me} wk={wk} /> : undefined}
      right={them ? <Player p={them} right wk={wk} /> : undefined}
      open={
        <>
          <Info p={me} />
          <Info p={them} right />
        </>
      }
    />
  );
}

/** The Swami's read on the game: who is favored, the gap, who still decides it, the matchups worth naming. */
function Swami({ live }: { live: LiveMatchup }) {
  const named = (side: LiveSide): LiveSide => ({ ...side, manager: teamByRoster(side.rosterId)?.teamName ?? side.team });
  const read = swamiRead({ ...live, away: named(live.away), home: named(live.home) });
  const line = swamiLine(read);
  if (read.settled || !line) return null;
  return (
    <Section title="Swami" action={{ href: '/lab/app/swami', label: 'Research' }}>
      <Card>
        <p className={ui.bodyText}>{line}</p>
        {read.path ? (
          <span className={ui.sub}>
            {read.path.need} to find, {read.path.upside} available from {read.path.players.length} still to play
          </span>
        ) : null}
        {read.edges.length ? (
          <Chips label="Matchups">
            {read.edges.map((e) => (
              <Tag key={e.player.id} tone={e.matchup!.label === 'hard' ? 'bad' : e.matchup!.label === 'soft' ? 'good' : 'neutral'}>
                {shortName(e.player.name, e.player.position, e.player.team)} {e.matchup!.label} vs {e.matchup!.opponent}
              </Tag>
            ))}
          </Chips>
        ) : null}
        {read.edges.length && read.confidence === 'thin' ? <span className={ui.spec}>Two games of defense data so far, a nudge, not a verdict</span> : null}
      </Card>
      {read.swing.length ? (
        <List tap>
          {read.swing.map((w) => (
            <Row
              key={w.player.id}
              data={{ player: w.player.id }}
              lead={<Face id={w.player.id} team={w.player.team} defense={w.player.position === 'DEF'} />}
              label="Still deciding it"
              title={shortName(w.player.name, w.player.position, w.player.team)}
              sub={w.manager}
              value={w.leverage.toFixed(1)}
              valueSub="Leverage"
            />
          ))}
        </List>
      ) : null}
    </Section>
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
  const wv = await weekView(week, mineId, data);
  const asked = Number(q.id);
  const other: GameView | undefined = Number.isInteger(asked) ? wv.all.find((g) => g.id === asked) : undefined;
  const mine = other ?? wv.mine;
  const base = mine ? wv.live.get(mine.id) : undefined;

  if (!mine || !base) {
    return (
      <Shell data={data} active="scores">
        <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} />
        <Empty action={{ href: '/lab/app/account', label: 'Pick your team' }}>Pick your team to see your matchup.</Empty>
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

  const lastMet = await lastMeeting(week, mine.a.rosterId, mine.b.rosterId);

  const inGames = new Set([...meSide.lineup, ...themSide.lineup].map((y) => y.nfl?.game.id).filter(Boolean));
  const relevant = ctx.nfl.filter((g) => inGames.has(g.id));
  const lineBook = mainBook(relevant.map((g) => ctx.lines[g.id]));
  const benchPts = (side: LiveSide) => side.bench.reduce((sum, y) => sum + y.points, 0);
  const rows = Math.max(meSide.bench.length, themSide.bench.length);

  return (
    <Shell data={data} active="scores">
      <LiveStart live={ctx.nfl.some((g) => g.state === 'in')} week={week} />
      <SectionHead icon="football" word="scores" title="Matchup" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/scores/${week}`, label: 'Scores' }} />
      <Hero
        label={isMine ? `Week ${week} Matchup` : `Week ${week}`}
        state={chip === 'Live' ? <LiveTag /> : <Label>{chip}</Label>}
        sides={[mine.a, mine.b].map((x) => ({ avatar: x.avatar, color: x.color, team: x.team, manager: x.manager, lost: x.lost, score: wk ? <LivePoints week={wk} rosterId={x.rosterId} fallback={x.score} /> : x.score.toFixed(2) }))}
        foot={
          final ? (
            <span>{mine.a.lines[0]}</span>
          ) : (
            <>
              <Meter pct={pct} label={`${pct}% to win`} />
              <span>
                <b>{pct}%</b> to win &middot; Yet to play: {mine.b.manager} ({yet.length}){yet.length ? ` ${yet.map((y) => y.position).join(', ')}` : ''}
              </span>
            </>
          )
        }
      />
      {!final ? (
        <a className={`${ui.pill} ${ui.pillSecondary}`} style={{ justifySelf: 'start' }} href={sleeperLink(isMine ? 'lineup' : 'matchup')} target="_blank" rel="noopener noreferrer">
          Open Sleeper
        </a>
      ) : null}
      <Section title="Starters">
        <Duel
          left={
            <>
              <Avatar src={mine.a.avatar} color={mine.a.color} size={28} />
              {mine.a.team}
            </>
          }
          right={
            <>
              <Avatar src={mine.b.avatar} color={mine.b.color} size={28} />
              {mine.b.team}
            </>
          }
        >
          {meSide.lineup.map((me, i) => (
            <SlotRow key={`${me.slot}-${i}`} me={me} them={themSide.lineup[i]} label={me.slot === 'SUPER_FLEX' ? 'SF' : me.slot} wk={wk} />
          ))}
        </Duel>
        {rows ? (
          <Drawer
            title="Bench"
            value={
              meSide.bench.concat(themSide.bench).some((y) => y.gameState !== 'pre')
                ? `${benchPts(meSide).toFixed(2)} · ${benchPts(themSide).toFixed(2)}`
                : `${meSide.bench.length} · ${themSide.bench.length} players`
            }
          >
            {Array.from({ length: rows }, (_, i) => (
              <SlotRow key={`bn-${i}`} me={meSide.bench[i]} them={themSide.bench[i]} label="BN" wk={wk} />
            ))}
          </Drawer>
        ) : null}
      </Section>
      {meSide.lineup.concat(themSide.lineup).some((y) => y.gameState !== 'pre') ? (
        <Section title="Top Performers">
          <div className={ui.tickets}>
            {[...meSide.lineup.map((y) => ({ p: y, owner: mine.a.team })), ...themSide.lineup.map((y) => ({ p: y, owner: mine.b.team }))]
              .filter(({ p: y }) => y.gameState !== 'pre')
              .sort((m1, m2) => m2.p.points - m1.p.points)
              .slice(0, 3)
              .map(({ p: y, owner: o }) => (
                <Ticket
                  key={y.id}
                  id={y.id}
                  color={y.nfl?.team.color}
                  logo={y.team ? ESPN_TEAM_LOGO(y.team) : null}
                  cutout={y.espnId ? ESPN_CUTOUT(y.espnId) : y.headshot}
                  name={shortName(y.name, y.position, y.team)}
                  sub={`${y.position} · ${o}`}
                  game={(() => {
                    const r = resultOf(y);
                    return r.wl ? `${r.wl} ${r.text}` : r.text;
                  })()}
                  points={y.points.toFixed(2)}
                  proj={(y.projected ?? 0).toFixed(2)}
                  strip={y.statLine || 'Yet to play'}
                />
              ))}
          </div>
        </Section>
      ) : null}
      <Swami live={live} />
      <Section title="Head to Head">
        <List>
          <Row title={lastMet ?? 'First meeting this season'} sub={`Records: ${mine.a.manager} ${record(mine.a.rosterId)} · ${mine.b.manager} ${record(mine.b.rosterId)}`} />
        </List>
      </Section>
      {meSide.lineup.concat(themSide.lineup).some((y) => y.gameState === 'pre') ? <NextGame players={meSide.lineup.concat(themSide.lineup)} week={week} /> : null}
      {relevant.length ? (
        <Section title="Their Games">
          <List tap>
            {relevant.length > 4 ? (
              <Row href={`/lab/app/nfl?week=${week}`} title="NFL Scores" sub={`${relevant.length} games with starters from this matchup`} />
            ) : (
              relevant.map((g) => <GameLine key={g.id} g={g} week={week} sides={[mine.a.manager, mine.b.manager]} counts={[meSide, themSide].map((side) => side.lineup.filter((y) => y.nfl?.game.id === g.id).length)} />)
            )}
          </List>
        </Section>
      ) : null}
      <p className={ui.spec}>Sources: Sleeper, ESPN, DraftSharks{lineBook ? `, ${lineBook}` : ''}</p>
    </Shell>
  );
}
