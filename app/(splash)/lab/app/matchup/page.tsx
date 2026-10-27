import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ESPN_CUTOUT, ESPN_TEAM_LOGO } from '@/lib/espn';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import type { LivePlayer } from '@/lib/matchup-live';
import { getV4Data, sleeperWinProb, type GameView, type SideView } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';

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
  if (g.game.state === 'pre') return { text: `${g.game.status} ${where}`, wl: null };
  const us = g.team.score ?? 0;
  const them = g.opponent.score ?? 0;
  if (g.game.state === 'in') return { text: `${us}-${them} ${where} · ${g.game.status}`, wl: null };
  return { text: `${us}-${them} ${where}`, wl: us > them ? 'W' : 'L' };
}

function Player({ p, right }: { p: LivePlayer; right?: boolean }) {
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
          <b>{pre ? '–' : p.points.toFixed(2)}</b>
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
function NextGame({ players }: { players: LivePlayer[] }) {
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
    <section className={s.ng} aria-label="Next game">
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
    </section>
  );
}

function HeroRow({ side, lost }: { side: SideView; lost: boolean }) {
  return (
    <div className={`${s.heroRow} ${lost ? s.heroLost : ''}`}>
      <span className={s.av} style={{ width: 34, height: 34, ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" /> : null}
      </span>
      <span className={s.heroWho}>
        <b>{side.team}</b>
        <small>{side.manager}</small>
      </span>
      <span className={s.heroScore}>{side.score.toFixed(2)}</span>
    </div>
  );
}

/** Your matchup: the two teams large on brand blue, then every slot head to head. */
export default async function V4Matchup({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const q = await searchParams;
  const jar = await cookies();
  const mineId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mineId);
  const asked = Number(q.id);
  const other: GameView | undefined = Number.isInteger(asked) ? data.others.find((g) => g.id === asked) : undefined;
  const mine = other ?? data.mine;
  const live = mine ? data.live.get(mine.id) : undefined;

  if (!mine || !live) {
    return (
      <Shell data={data} active="scores">
        <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} />
        <p className={s.empty}>
          Pick your team to see your matchup. <Link href="/lab/app/account">Account</Link>
        </p>
      </Shell>
    );
  }

  const meSide = live.away.rosterId === mine.a.rosterId ? live.away : live.home;
  const themSide = meSide === live.away ? live.home : live.away;
  const p = sleeperWinProb(meSide.points, meSide.expected, themSide.points, themSide.expected);
  const pct = Math.round(p * 100);
  const final = data.state === 'final';
  const yet = themSide.lineup.filter((x) => x.gameState === 'pre');
  const chip = data.state === 'live' ? 'Live' : final ? 'Final' : 'Preview';

  return (
    <Shell data={data} active="scores">
      <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} />
      <section className={s.hero} aria-label={`Week ${data.week} matchup`}>
        <div className={s.heroTop}>
          <span>Week {data.week} Matchup</span>
          <span className={data.state === 'live' ? s.liveChip : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {data.state === 'live' ? <i className={s.liveDot} aria-hidden /> : null}
            {chip}
          </span>
        </div>
        <HeroRow side={mine.a} lost={mine.a.lost} />
        <HeroRow side={mine.b} lost={mine.b.lost} />
        {final ? (
          <div className={s.heroWin}>{mine.a.lines[0]}</div>
        ) : (
          <div className={s.heroWin}>
            <i>
              <u style={{ width: `${pct}%` }} />
            </i>
            <span>
              <b>{pct}%</b> to win &middot; Yet to play: {mine.b.manager} ({yet.length}){yet.length ? ` ${yet.map((x) => x.position).join(', ')}` : ''}
            </span>
          </div>
        )}
      </section>
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
        {meSide.lineup.map((me, i) => {
          const them = themSide.lineup[i];
          if (!them) return null;
          return (
            <div key={`${me.slot}-${i}`} className={s.slot}>
              <Player p={me} />
              <span className={s.slotChip}>{me.slot === 'SUPER_FLEX' ? 'SF' : me.slot}</span>
              <Player p={them} right />
            </div>
          );
        })}
      </div>
      <div className={s.title}>
        <h2>Top Performers</h2>
      </div>
      <div className={s.tks}>
        {[...meSide.lineup.map((p) => ({ p, owner: mine.a.team })), ...themSide.lineup.map((p) => ({ p, owner: mine.b.team }))]
          .filter(({ p }) => p.gameState !== 'pre')
          .sort((x, y) => y.p.points - x.p.points)
          .slice(0, 3)
          .map(({ p, owner }) => (
            <Ticket key={p.id} p={p} owner={owner} />
          ))}
      </div>
      {meSide.lineup.concat(themSide.lineup).some((p) => p.gameState === 'pre') ? (
        <>
          <div className={s.title}>
            <h2>Next Game</h2>
          </div>
          <NextGame players={meSide.lineup.concat(themSide.lineup)} />
        </>
      ) : null}
    </Shell>
  );
}
