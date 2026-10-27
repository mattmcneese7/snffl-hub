import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { TROPHIES, type TrophyKey } from '@/components/Trophy';
import { firstNameOf } from '@/config/managers';
import { getChugCounts, getPointsByWeek } from '@/lib/awards';
import { league, playerOf, getStandings, teamByRoster } from '@/lib/league';
import type { LivePlayer } from '@/lib/matchup-live';
import { movementFor, timing, type MovementEvent } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getOddsFor } from '@/lib/playoff-odds';
import { getRosters } from '@/lib/sleeper';
import { getTrophyBoard } from '@/lib/trophies';
import { getV4Data, type SideView } from '../../data';
import { Ms } from '../../icons';
import Shell, { SectionHead } from '../../Shell';
import PointsBars from '../../players/PointsBars';
import s from '../../v4.module.css';
import p from '../../players/p4.module.css';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ rosterId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { rosterId } = await params;
  const t = teamByRoster(Number(rosterId));
  return { title: { absolute: `${t?.teamName.trim() ?? 'Manager'}, Splash 4.0` }, robots: { index: false, follow: false } };
}

const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const kickoff = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));
// Best hardware first, the Shart and the Plunger last.
const SHELF: TrophyKey[] = ['champion', 'motw', 'blowout', 'squeaker', 'lucky', 'heartbreaker', 'bench', 'shart', 'plunger'];
const MOVE: Record<MovementEvent['kind'], { mark: string; tone: string }> = {
  add: { mark: 'ADD', tone: p.good },
  drop: { mark: 'DROP', tone: p.bad },
  start: { mark: 'START', tone: p.blue },
  bench: { mark: 'BENCH', tone: p.neutral },
};
const short = (id: string) => {
  const pl = playerOf(id);
  return pl.position === 'DEF' ? pl.name : pl.short || pl.name;
};
const sayMove = (e: MovementEvent) => {
  const other = e.otherId ? short(e.otherId) : null;
  switch (e.kind) {
    case 'start':
      return other ? `Started ${short(e.playerId)} over ${other}` : `Started ${short(e.playerId)}`;
    case 'bench':
      return `Benched ${short(e.playerId)}`;
    case 'add':
      return `Added ${short(e.playerId)}`;
    case 'drop':
      return `Dropped ${short(e.playerId)}`;
  }
};

/** "W 16-10 vs IND", "Sun 12:00 PM @ NYJ", "Q3 4:12 · 17-10 vs DET", as Sleeper prints them. */
function gameOf(lp: LivePlayer | undefined): string {
  if (!lp) return '';
  if (lp.gameState === 'bye') return 'Bye';
  const g = lp.nfl;
  if (!g) return '';
  const where = `${g.home ? 'vs' : '@'} ${g.opponent.abbr}`;
  const us = g.team.score ?? 0;
  const them = g.opponent.score ?? 0;
  if (g.game.state === 'pre') return `${kickoff(g.game.kickoff)} ${where}`;
  if (g.game.state === 'in') return `${g.game.status} · ${us}-${them} ${where}`;
  return `${us > them ? 'W' : us < them ? 'L' : 'T'} ${us}-${them} ${where}`;
}

function SideRow({ side }: { side: SideView }) {
  return (
    <span className={`${s.row} ${side.lost ? s.lost : ''}`}>
      <span className={s.av} style={{ width: 26, height: 26, ['--mgr' as string]: side.color }}>
        {side.avatar ? <img src={side.avatar} alt="" /> : null}
      </span>
      <span className={s.who}>
        <b>{side.team}</b>
        <small>{side.manager}</small>
      </span>
      <span className={s.score}>{side.score.toFixed(2)}</span>
      <small className={s.mark}>{side.mark === 'W' || side.mark === 'L' ? <b className={side.mark === 'W' ? s.win : s.loss}>{side.mark}</b> : side.mark}</small>
    </span>
  );
}

/**
 * One manager: who he is and what the season says about him, this week's
 * game, the season in four numbers, the whole roster with this week's
 * points beside every player, his hardware, his scores week by week and his
 * own moves. Everything v3's manager page carried.
 */
export default async function V4Manager({ params }: Params) {
  const { rosterId: raw } = await params;
  const rosterId = Number(raw);
  const team = teamByRoster(rosterId);
  if (!team) notFound();
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings, byWeek, odds, board, moves, chugs, rosters] = await Promise.all([
    getV4Data(mine),
    getStandings().catch(() => []),
    getPointsByWeek(rosterId).catch(() => []),
    getOddsFor(rosterId).catch(() => undefined),
    getTrophyBoard().catch(() => null),
    movementFor(rosterId).catch(() => [] as MovementEvent[]),
    getChugCounts().catch(() => []),
    getRosters().catch(() => null),
  ]);
  const name = firstNameOf(rosterId) ?? team.manager;
  const standing = standings.find((x) => x.rosterId === rosterId);
  const t = standing ?? team;

  // This week's game, this manager on top.
  const games = [...(data.mine ? [data.mine] : []), ...data.others];
  const found = games.find((g) => g.a.rosterId === rosterId || g.b.rosterId === rosterId);
  const game = found && found.b.rosterId === rosterId ? { ...found, a: found.b, b: found.a } : found;
  const lm = game ? data.live.get(game.id) : undefined;
  const side = lm ? (lm.away.rosterId === rosterId ? lm.away : lm.home) : undefined;
  const liveBy = new Map<string, LivePlayer>();
  for (const pl of [...(side?.lineup ?? []), ...(side?.bench ?? [])]) liveBy.set(pl.id, pl);

  // Lore: labels, not sentences.
  const all = board?.all ?? [];
  const weeksOf = (list: (number | null)[]) =>
    list
      .filter((x): x is number => x != null)
      .sort((a, b) => a - b)
      .map((x) => `W${x}`)
      .join(', ');
  const lore: { text: string; tone: string }[] = [];
  const streak = standing?.streak ?? '';
  const run = Number(streak.slice(1));
  if (run >= 2) lore.push({ text: streak.startsWith('W') ? `${run} game win streak` : `${run} game losing streak`, tone: streak.startsWith('W') ? p.good : p.bad });
  const motw = all.filter((a) => a.kind === 'motw' && a.rosterId === rosterId);
  if (motw.length) lore.push({ text: `Manager of the Week ${weeksOf(motw.map((a) => a.week))}`, tone: p.gold });
  const sharts = all.filter((a) => a.kind === 'shart' && a.rosterId === rosterId);
  if (sharts.length) lore.push({ text: `Shart ${weeksOf(sharts.map((a) => a.week))}`, tone: p.bad });
  const chugged = chugs.find((c) => c.rosterId === rosterId)?.weeks ?? [];
  if (chugged.length) lore.push({ text: `Chugged ${weeksOf(chugged)}`, tone: p.bad });

  const mineAwards = all.filter((a) => a.rosterId === rosterId);
  const shelf = SHELF.map((kind) => ({ kind, list: mineAwards.filter((a) => a.kind === kind) })).filter((x) => x.list.length);

  // The roster, live from Sleeper, the nightly starters if that fails.
  const live = rosters?.find((r) => r.roster_id === rosterId) as { starters?: string[]; players?: string[]; reserve?: string[] | null; taxi?: string[] | null } | undefined;
  const starterSlots = live?.starters ?? team.starters;
  const starters = starterSlots.filter((id) => id && id !== '0');
  const slotNames = league.rosterPositions.filter((x) => x !== 'BN' && x !== 'IR' && x !== 'TAXI');
  const lineup = slotNames.map((slot, i) => ({ slot: slot === 'SUPER_FLEX' ? 'SF' : slot, id: starterSlots[i] && starterSlots[i] !== '0' ? starterSlots[i] : null }));
  const reserve = (live?.reserve ?? []).filter(Boolean);
  const taxi = (live?.taxi ?? []).filter(Boolean);
  const bench = (live?.players ?? []).filter((id) => !starters.includes(id) && !reserve.includes(id) && !taxi.includes(id));

  const playerRow = (id: string, slot: string) => {
    const pl = playerOf(id);
    const lp = liveBy.get(id);
    const pre = !lp || lp.gameState === 'pre' || lp.gameState === 'bye';
    return (
      <button key={`${slot}-${id}`} type="button" data-player={id} className={`${p.row} ${p.withSlot}`} aria-label={`${pl.name}, open player`}>
        <span className={p.slot}>{slot}</span>
        <span className={`${p.face} ${pl.position === 'DEF' ? p.faceDef : ''}`}>
          <img src={pl.headshot} alt="" loading="lazy" />
        </span>
        <span className={p.rowName}>
          <b>{short(id)}</b>
          <small>
            <i className={`${s.pos} ${s[`p${pl.position}`] ?? ''}`}>{pl.position}</i>
            {pl.position === 'DEF' ? null : <span>{pl.team ?? 'FA'}</span>}
            {gameOf(lp) ? <span>{gameOf(lp)}</span> : null}
            {lp?.injury || pl.injuryStatus ? <span className={p.inj}>{lp?.injury ?? pl.injuryStatus}</span> : null}
          </small>
          {!pre && lp?.statLine ? <em>{lp.statLine}</em> : null}
        </span>
        <span className={p.rowPts}>
          <b>{lp && !pre ? lp.points.toFixed(2) : '–'}</b>
          <small>{lp?.projected != null ? `Proj ${lp.projected.toFixed(2)}` : ''}</small>
        </span>
      </button>
    );
  };

  return (
    <Shell data={data} active="league">
      <div className={p.wrap}>
        <SectionHead icon="person" word="manager" week={data.week} mine={data.myRoster} />

        <section className={s.card}>
          <div className={p.mHero}>
            <span className={s.av} style={{ width: 60, height: 60, ['--mgr' as string]: team.colors?.primary }}>
              {team.avatarUrl ? <img src={team.avatarUrl} alt="" /> : null}
            </span>
            <div style={{ minWidth: 0 }}>
              <h1>{team.teamName.trim()}</h1>
              <p>
                {name} &middot; @{team.manager} on Sleeper
              </p>
            </div>
          </div>
          {rosterId === mine || lore.length ? (
            <div className={p.chips}>
              {rosterId === mine ? <span className={`${p.chip} ${p.blue}`}>Your team</span> : null}
              {lore.map((l) => (
                <span key={l.text} className={`${p.chip} ${l.tone}`}>
                  {l.text}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className={s.title}>
          <h2>Week {data.week} Matchup</h2>
          {game ? <Link href={`/lab/app/matchup?id=${game.id}`}>Full matchup</Link> : null}
        </div>
        {game ? (
          <Link href={`/lab/app/matchup?id=${game.id}`} className={s.list} style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className={s.game}>
              <SideRow side={game.a} />
              <SideRow side={game.b} />
              <small className={s.foot}>{game.foot}</small>
            </span>
          </Link>
        ) : (
          <p className={s.empty}>No game on the board this week.</p>
        )}

        <div className={s.title}>
          <h2>Season</h2>
          <Link href="/lab/app/league">Standings</Link>
        </div>
        <section className={s.card}>
          <div className={p.tiles}>
            <span className={p.tile}>
              <b>{record(t)}</b>
              <small>Record</small>
            </span>
            <span className={p.tile}>
              <b>{standing ? ordinal(standing.seed) : '–'}</b>
              <small>Seed</small>
              <small>{standing ? (standing.inPlayoffs ? 'In playoffs' : 'Out') : ''}</small>
            </span>
            <span className={p.tile}>
              <b>{t.pointsFor.toFixed(1)}</b>
              <small>Points for</small>
              <small>Against {t.pointsAgainst.toFixed(1)}</small>
            </span>
            <span className={p.tile}>
              <b>{odds ? `${odds.makePlayoffs.toFixed(0)}%` : '–'}</b>
              <small>Playoffs</small>
              <small>{odds ? `Bye ${odds.bye.toFixed(0)}%` : ''}</small>
            </span>
          </div>
          {odds ? (
            <div className={p.chips}>
              <span className={`${p.chip} ${odds.tag === 'Clinched' || odds.tag === 'Clinch Watch' ? p.good : odds.tag === 'Bubble' ? '' : p.bad}`}>{odds.tag}</span>
            </div>
          ) : null}
        </section>

        <div className={s.title}>
          <h2>Roster</h2>
          <span className={p.count}>{starters.length + bench.length + reserve.length + taxi.length} players</span>
        </div>
        {starters.length || bench.length || reserve.length ? (
          <>
            <div className={s.list}>
              {lineup.map(({ slot, id }, i) =>
                id ? (
                  playerRow(id, slot)
                ) : (
                  <span key={`empty-${i}`} className={`${p.row} ${p.withSlot}`} style={{ cursor: 'default' }}>
                    <span className={p.slot}>{slot}</span>
                    <span className={p.face} />
                    <span className={p.rowName}>
                      <b>Empty</b>
                      <small>No one in this slot</small>
                    </span>
                    <span />
                  </span>
                ),
              )}
            </div>
            {bench.length ? (
              <>
                <span className={`${p.label} ${p.subHead}`}>Bench &middot; {bench.length}</span>
                <div className={s.list}>{bench.map((id) => playerRow(id, 'BN'))}</div>
              </>
            ) : null}
            {reserve.length ? (
              <>
                <span className={`${p.label} ${p.subHead}`}>Injured reserve &middot; {reserve.length}</span>
                <div className={s.list}>{reserve.map((id) => playerRow(id, 'IR'))}</div>
              </>
            ) : null}
            {taxi.length ? (
              <>
                <span className={`${p.label} ${p.subHead}`}>Taxi &middot; {taxi.length}</span>
                <div className={s.list}>{taxi.map((id) => playerRow(id, 'TAXI'))}</div>
              </>
            ) : null}
          </>
        ) : (
          <p className={s.empty}>Roster unavailable from Sleeper.</p>
        )}

        <div className={s.title}>
          <h2>Trophy Case</h2>
          <span className={p.count}>{mineAwards.length} won</span>
        </div>
        {shelf.length ? (
          <section className={s.card}>
            <div className={p.shelf}>
              {shelf.map(({ kind, list }) => (
                <div key={kind} className={`${p.award} ${kind === 'shart' || kind === 'plunger' ? p.awardBad : ''}`}>
                  <span>
                    <Ms name="trophy" size={18} />
                  </span>
                  <b>
                    {TROPHIES[kind].name}
                    {list.length > 1 ? ` ×${list.length}` : ''}
                  </b>
                  <small>{list.map((a) => (a.week ? `W${a.week}` : 'Season')).join(', ')}</small>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className={s.empty}>No hardware yet.</p>
        )}

        <div className={s.title}>
          <h2>Points by Week</h2>
          <span className={p.count}>{byWeek.length} played</span>
        </div>
        <section className={s.card}>
          <PointsBars
            points={byWeek.map((x) => ({ week: x.week, points: x.points, good: x.won }))}
            playoffWeekStart={league.playoffWeekStart}
            weeks={Math.max(1, ...byWeek.map((x) => x.week))}
            solid="Won"
            hollow="Lost"
          />
        </section>

        <div className={s.title}>
          <h2>Moves</h2>
          <span className={p.count}>Latest 10</span>
        </div>
        {moves.length ? (
          <div className={s.list}>
            {moves.slice(0, 10).map((e) => (
              <button key={e.id} type="button" data-player={e.playerId} className={p.row} aria-label={`${playerOf(e.playerId).name}, open player`}>
                <span className={`${p.mark} ${MOVE[e.kind].tone}`}>{MOVE[e.kind].mark}</span>
                <span className={p.rowName}>
                  <b>{sayMove(e)}</b>
                  <small>
                    Week {e.week} &middot; {timing(e.at)}
                  </small>
                </span>
                <span />
              </button>
            ))}
          </div>
        ) : (
          <p className={s.empty}>No moves logged for {name} yet.</p>
        )}
      </div>
    </Shell>
  );
}
