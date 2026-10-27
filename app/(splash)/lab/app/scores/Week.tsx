import { cookies } from 'next/headers';
import { lastFantasyWeek } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import type { NflGame } from '@/lib/gameday';
import { getV4Data, type GameView } from '../data';
import Shell, { SectionHead } from '../Shell';
import MatchupRows from '../modules/MatchupRows';
import { kickoffText, quarter } from './parts';
import { weekView, type WeekView } from './weekData';
import WeekStrip from './WeekStrip';
import { LivePoints, LiveStart } from '../live/Live';
import { Crest, Empty, Hero, Label, LiveTag, Meter, Rail, Section, Tile, TileRow } from '../ui';

/** Your game on brand blue: both teams, the scores and where it stands. One tap into the full matchup. */
function YourGame({ g, wv }: { g: GameView; wv: WeekView }) {
  const m = wv.live.get(g.id)!;
  const final = wv.state === 'final' || m.game.status === 'final';
  const live = m.game.inPlay && !final;
  const pct = Number(g.a.mark.replace('%', ''));
  const score = (x: GameView['a']) => (live ? <LivePoints week={wv.week} rosterId={x.rosterId} fallback={x.score} /> : x.score.toFixed(2));
  return (
    <Hero
      id="yourGame"
      href={`/lab/app/matchup?id=${g.id}&week=${wv.week}`}
      label={`Week ${wv.week} Matchup`}
      state={live ? <LiveTag /> : <Label>{final ? 'Final' : wv.state === 'preview' ? 'Preview' : 'Live'}</Label>}
      sides={[g.a, g.b].map((x) => ({ avatar: x.avatar, color: x.color, team: x.team, manager: x.manager, score: score(x), lost: x.lost }))}
      foot={
        !final && Number.isFinite(pct) ? (
          <>
            <Meter pct={pct} label={`${pct}% to win`} />
            <span>
              <b>{pct}%</b> to win &middot; {g.a.lines[0]}
            </span>
          </>
        ) : (
          <span>{g.a.lines[0]}</span>
        )
      }
    />
  );
}

/** One NFL game as a ticker tile: the clock or kickoff, both clubs and the score. */
function NflTile({ game, week }: { game: NflGame; week: number }) {
  const post = game.state === 'post';
  const a = game.away.score ?? 0;
  const h = game.home.score ?? 0;
  return (
    <Tile href={`/lab/app/nfl/${game.id}?week=${week}`} label={`${game.away.name} at ${game.home.name}`} head={game.state === 'in' ? <LiveTag text={quarter(game.period, game.clock)} /> : post ? 'Final' : kickoffText(game.kickoff)}>
      <TileRow crest={<Crest src={game.away.logo} size={24} />} name={game.away.abbr} value={game.state === 'pre' ? undefined : a} lost={post && a < h} />
      <TileRow crest={<Crest src={game.home.logo} size={24} />} name={game.home.abbr} value={game.state === 'pre' ? undefined : h} lost={post && h < a} />
    </Tile>
  );
}

/**
 * Scores, a scoreboard: pick a week, your game first, then every league
 * matchup as one list, then the NFL scores as a ticker. Each opens its own
 * page; the depth lives there.
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
        <Empty action={mine == null ? { href: '/lab/app/account', label: 'Pick your team' } : undefined}>
          {mine != null ? `No game for your team in week ${wk}.` : 'Pick your team and your game leads this page.'}
        </Empty>
      )}
      <Section title="League Matchups">
        {wv.others.length ? <MatchupRows games={wv.others} week={wk} live={wv.state === 'live'} current={wk === data.week} /> : <Empty>No matchups posted for week {wk}.</Empty>}
      </Section>
      {nfl.length ? (
        <Section title="NFL Scores" action={{ href: `/lab/app/nfl?week=${wk}`, label: 'All games' }}>
          <Rail label="NFL scores">
            {nfl.map((g) => (
              <NflTile key={g.id} game={g} week={wk} />
            ))}
          </Rail>
        </Section>
      ) : null}
    </Shell>
  );
}
