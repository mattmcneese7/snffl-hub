import Link from 'next/link';
import { cookies } from 'next/headers';
import { lastFantasyWeek } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import type { NflGame } from '@/lib/gameday';
import { getV4Data, type GameView } from '../data';
import Shell, { SectionHead } from '../Shell';
import MatchupRows from '../modules/MatchupRows';
import { LiveChip, kickoffText, quarter } from './parts';
import { weekView, type WeekView } from './weekData';
import WeekStrip from './WeekStrip';
import { LivePoints, LiveStart } from '../live/Live';
import s from '../v4.module.css';
import x from './scores.module.css';

/** Your game on brand blue, trimmed to the scores and where it stands; the card opens the full matchup. */
function YourGame({ g, wv }: { g: GameView; wv: WeekView }) {
  const m = wv.live.get(g.id)!;
  const final = wv.state === 'final' || m.game.status === 'final';
  const pct = Number(g.a.mark.replace('%', ''));
  const chip = m.game.inPlay ? <LiveChip /> : <span>{final ? 'Final' : wv.state === 'preview' ? 'Preview' : 'Live'}</span>;
  return (
    <Link id="yourGame" href={`/lab/app/matchup?id=${g.id}&week=${wv.week}`} className={`${s.hero} ${x.heroLink}`} aria-label={`Week ${wv.week} matchup, open the full matchup`}>
      <span className={s.heroTop}>
        <span>Week {wv.week} Matchup</span>
        {chip}
      </span>
      {[g.a, g.b].map((side) => (
        <span key={side.rosterId} className={`${s.heroRow} ${side.lost ? s.heroLost : ''}`}>
          <span className={s.av} style={{ width: 34, height: 34, ['--mgr' as string]: side.color }}>
            {side.avatar ? <img src={side.avatar} alt="" /> : null}
          </span>
          <span className={s.heroWho}>
            <b>{side.team}</b>
            <small>{side.manager}</small>
          </span>
          <span className={s.heroScore}>{m.game.inPlay && !final ? <LivePoints week={wv.week} rosterId={side.rosterId} fallback={side.score} /> : side.score.toFixed(2)}</span>
        </span>
      ))}
      <span className={s.heroWin}>
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
      </span>
    </Link>
  );
}

/** One NFL game as a ticker tile: the clock or kickoff, both clubs and the score. */
function NflTile({ game, week }: { game: NflGame; week: number }) {
  const post = game.state === 'post';
  const a = game.away.score ?? 0;
  const h = game.home.score ?? 0;
  const side = (t: NflGame['away'], lost: boolean) => (
    <span className={`${x.tkRow} ${lost ? x.tkLost : ''}`}>
      {t.logo ? <img src={t.logo} alt="" loading="lazy" /> : <span />}
      <b>{t.abbr}</b>
      <span className={x.tkScore}>{game.state === 'pre' ? '' : (t.score ?? 0)}</span>
    </span>
  );
  return (
    <Link href={`/lab/app/nfl/${game.id}?week=${week}`} className={x.tk} aria-label={`${game.away.name} at ${game.home.name}`}>
      <span className={x.tkHead}>{game.state === 'in' ? <LiveChip text={quarter(game.period, game.clock)} /> : post ? 'Final' : kickoffText(game.kickoff)}</span>
      {side(game.away, post && a < h)}
      {side(game.home, post && h < a)}
    </Link>
  );
}

/**
 * The Scores tab, a scoreboard: pick a week, your game first, then every
 * league matchup as one list, then the NFL games as a ticker. Each opens
 * its own page; the depth lives there, not here.
 */
export default async function ScoresWeek({ week }: { week?: number }) {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const wk = week ?? data.week;
  const wv = await weekView(wk, mine, data);
  const live = wv.ctx.nfl.some((g) => g.state === 'in');
  const order = { in: 0, pre: 1, post: 2 } as const;
  const nfl = [...wv.ctx.nfl].sort((a, b) => order[a.state] - order[b.state] || a.kickoff.localeCompare(b.kickoff));

  return (
    <Shell data={data} active="scores" barDock={wk === data.week && wv.mine ? 'yourGame' : undefined}>
      <LiveStart live={live} week={wk} />
      <SectionHead icon="football" word="scores" week={data.week} mine={data.myRoster} />
      <WeekStrip week={wk} last={lastFantasyWeek()} base="/lab/app/scores" />
      {wv.mine ? (
        <YourGame g={wv.mine} wv={wv} />
      ) : (
        <p className={s.empty}>
          {mine != null ? `No game for your team in week ${wk}.` : 'Pick your team to see your game first.'} {mine == null ? <Link href="/lab/app/account">Account</Link> : null}
        </p>
      )}
      <div className={s.title}>
        <h2>League Matchups</h2>
      </div>
      {wv.others.length ? (
        <MatchupRows games={wv.others} week={wk} live={wv.state === 'live'} current={wk === data.week} />
      ) : (
        <p className={s.empty}>No matchups posted for week {wk}.</p>
      )}
      {nfl.length ? (
        <>
          <div className={s.title}>
            <h2>NFL Games</h2>
            <Link href={`/lab/app/nfl?week=${wk}`}>Full slate</Link>
          </div>
          <div className={`${s.rail} ${x.tks}`}>
            {nfl.map((g) => (
              <NflTile key={g.id} game={g} week={wk} />
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}
