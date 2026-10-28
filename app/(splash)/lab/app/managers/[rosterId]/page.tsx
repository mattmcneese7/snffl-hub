import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { TROPHY_NAMES as TROPHIES, type TrophyKey } from '@/lib/trophy-names';
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
import Shell, { SectionHead } from '../../Shell';
import { Avatar, Card, Drawer, Empty, Face, List, Pair, Row, Section, Tag, type PairSide, type Tone } from '../../ui';
import { ProfileHead } from '../../ui/blocks/ProfileHead';
import { WeekBars } from '../../ui/blocks/WeekBars';
import { Pos } from '../../ui/blocks/Pos';
import StatGrid from '../../players/StatGrid';
import l from '../../players/layout.module.css';
import { injAbbr } from '../../injury';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ rosterId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { rosterId } = await params;
  const t = teamByRoster(Number(rosterId));
  return { title: { absolute: `${t?.teamName.trim() ?? 'Manager'}, Splash` }, robots: { index: false, follow: false } };
}

const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const kickoff = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));
// Best hardware first, the Shart and the Plunger last.
const SHELF: TrophyKey[] = ['champion', 'motw', 'blowout', 'squeaker', 'lucky', 'heartbreaker', 'bench', 'shart', 'plunger'];
const MOVE: Record<MovementEvent['kind'], { mark: string; tone: Tone }> = {
  add: { mark: 'Add', tone: 'good' },
  drop: { mark: 'Drop', tone: 'bad' },
  start: { mark: 'Start', tone: 'neutral' },
  bench: { mark: 'Bench', tone: 'neutral' },
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

/** One side of this week's game, as the kit pair draws it. */
const pairSide = (side: SideView): PairSide => ({
  lead: <Avatar src={side.avatar} color={side.color} size={28} />,
  title: side.team,
  sub: side.manager,
  value: side.score.toFixed(2),
  mark: side.mark,
  lost: side.lost,
});

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
  const lore: { text: string; tone: Tone }[] = [];
  const streak = standing?.streak ?? '';
  const run = Number(streak.slice(1));
  if (run >= 2) lore.push({ text: streak.startsWith('W') ? `${run} game win streak` : `${run} game losing streak`, tone: streak.startsWith('W') ? 'good' : 'bad' });
  const motw = all.filter((a) => a.kind === 'motw' && a.rosterId === rosterId);
  if (motw.length) lore.push({ text: `Manager of the Week ${weeksOf(motw.map((a) => a.week))}`, tone: 'gold' });
  const sharts = all.filter((a) => a.kind === 'shart' && a.rosterId === rosterId);
  if (sharts.length) lore.push({ text: `Shart ${weeksOf(sharts.map((a) => a.week))}`, tone: 'bad' });
  const chugged = chugs.find((c) => c.rosterId === rosterId)?.weeks ?? [];
  if (chugged.length) lore.push({ text: `Chugged ${weeksOf(chugged)}`, tone: 'bad' });

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
    const inj = lp?.injury ?? pl.injuryStatus ?? null;
    const line = [inj ? injAbbr(inj) : '', gameOf(lp), !pre && lp?.statLine ? lp.statLine : ''].filter(Boolean).join(' \u00b7 ');
    return (
      <Row
        key={`${slot}-${id}`}
        data={{ player: id }}
        lead={<Face id={id} team={pl.team} defense={pl.position === 'DEF'} />}
        label={slot}
        title={short(id)}
        sub={
          <>
            <Pos position={pl.position} />
            {line ? ` ${line}` : ''}
          </>
        }
        value={lp && !pre ? lp.points.toFixed(2) : '\u2013'}
        valueSub={lp?.projected != null ? `Proj ${lp.projected.toFixed(2)}` : undefined}
      />
    );
  };

  return (
    <Shell data={data} active="league">
      <SectionHead icon="person" word="manager" week={data.week} mine={data.myRoster} back={{ href: '/managers', label: 'Managers' }} />

      <ProfileHead
        lead={<Avatar src={team.avatarUrl} color={team.colors?.primary} size={44} />}
        name={team.teamName.trim()}
        meta={`${name} \u00b7 @${team.manager} on Sleeper`}
        tags={
          rosterId === mine || lore.length ? (
            <>
              {rosterId === mine ? <Tag>Your team</Tag> : null}
              {lore.map((x) => (
                <Tag key={x.text} tone={x.tone}>
                  {x.text}
                </Tag>
              ))}
            </>
          ) : undefined
        }
      />

      <Section title={`Week ${data.week} Matchup`}>
        {game ? (
          <List tap>
            <Pair href={`/matchup?id=${game.id}`} label={`${game.a.team} vs ${game.b.team}`} sides={[pairSide(game.a), pairSide(game.b)]} foot={game.foot} />
          </List>
        ) : (
          <Empty>No game on the board this week.</Empty>
        )}
      </Section>

      <Section title="Season" action={{ href: '/league', label: 'Standings' }}>
        <Card>
          <StatGrid
            items={[
              { value: record(t), label: 'Record' },
              { value: standing ? ordinal(standing.seed) : '\u2013', label: standing ? (standing.inPlayoffs ? 'Seed, in' : 'Seed, out') : 'Seed' },
              { value: t.pointsFor.toFixed(1), label: 'Points for' },
              { value: t.pointsAgainst.toFixed(1), label: 'Against' },
              ...(odds
                ? [
                    { value: `${odds.makePlayoffs.toFixed(0)}%`, label: 'Playoffs' },
                    { value: `${odds.bye.toFixed(0)}%`, label: 'Bye' },
                  ]
                : []),
            ]}
          />
          {odds ? (
            <span className={l.lead}>
              <Tag tone={odds.tag === 'Clinched' || odds.tag === 'Clinch Watch' ? 'good' : odds.tag === 'Bubble' ? 'neutral' : 'bad'}>{odds.tag}</Tag>
            </span>
          ) : null}
        </Card>
      </Section>

      <Section title="Roster">
        {starters.length || bench.length || reserve.length ? (
          <>
            <List tap>
              {lineup.map(({ slot, id }, i) => (id ? playerRow(id, slot) : <Row key={`empty-${i}`} label={slot} title="Empty" muted sub="No one in this slot" />))}
            </List>
            {bench.length ? (
              <Drawer title="Bench" value={bench.length}>
                {bench.map((id) => playerRow(id, 'BN'))}
              </Drawer>
            ) : null}
            {reserve.length ? (
              <Drawer title="Injured Reserve" value={reserve.length}>
                {reserve.map((id) => playerRow(id, 'IR'))}
              </Drawer>
            ) : null}
            {taxi.length ? (
              <Drawer title="Taxi" value={taxi.length}>
                {taxi.map((id) => playerRow(id, 'TAXI'))}
              </Drawer>
            ) : null}
          </>
        ) : (
          <Empty>Roster unavailable from Sleeper.</Empty>
        )}
      </Section>

      <Section title="Trophy Case">
        {shelf.length ? (
          <List>
            {shelf.map(({ kind, list }) => (
              <Row key={kind} title={TROPHIES[kind].name} sub={list.map((a) => (a.week ? `W${a.week}` : 'Season')).join(', ')} value={`\u00d7${list.length}`} />
            ))}
          </List>
        ) : (
          <Empty>No hardware yet.</Empty>
        )}
      </Section>

      <Section title="Points by Week">
        <Card>
          <WeekBars
            points={byWeek.map((x) => ({ week: x.week, points: x.points, good: x.won }))}
            playoffWeekStart={league.playoffWeekStart}
            weeks={Math.max(1, ...byWeek.map((x) => x.week))}
            solid="Won"
            hollow="Lost"
          />
        </Card>
      </Section>

      <Section title="Recent Activity">
        {moves.length ? (
          <List tap>
            {moves.slice(0, 10).map((e) => (
              <Row
                key={e.id}
                data={{ player: e.playerId }}
                lead={
                  <span className={l.mark}>
                    <Tag tone={MOVE[e.kind].tone}>{MOVE[e.kind].mark}</Tag>
                  </span>
                }
                title={sayMove(e)}
                sub={`Week ${e.week} \u00b7 ${timing(e.at)}`}
              />
            ))}
          </List>
        ) : (
          <Empty>No moves logged for {name} yet.</Empty>
        )}
      </Section>
    </Shell>
  );
}
