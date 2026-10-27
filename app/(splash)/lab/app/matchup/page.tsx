import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ESPN_TEAM_LOGO } from '@/lib/espn';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import type { LivePlayer } from '@/lib/matchup-live';
import { getV4Data, sleeperWinProb, type SideView } from '../data';
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
    <span className={`${s.pl} ${right ? s.r : ''}`}>
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
    </span>
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
export default async function V4Matchup() {
  const jar = await cookies();
  const mineId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mineId);
  const mine = data.mine;
  const live = mine ? data.live.get(mine.id) : undefined;

  if (!mine || !live) {
    return (
      <Shell data={data} active="scores">
        <SectionHead icon="football" word="scores" week={data.week} />
        <p className={s.empty}>
          Pick your team to see your matchup. <Link href="/settings">Settings</Link>
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
      <SectionHead icon="football" word="scores" week={data.week} />
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
    </Shell>
  );
}
