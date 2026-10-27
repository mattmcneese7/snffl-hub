import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { league, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getPostseason, type BracketGame, type BracketRound, type BracketSide, type Postseason } from '@/lib/postseason';
import { getV4Data } from '../../data';
import { Ms } from '../../icons';
import Shell, { SectionHead } from '../../Shell';
import s from '../../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'Bracket, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const NONE: Postseason = { rounds: [], shartBowl: [], championRosterId: null, shartRosterId: null, byeRosterIds: [] };

/** A team that shows up in round 2 without a round 1 game sat round 1 out. */
function byesOf(rounds: BracketRound[]) {
  const r1 = rounds.find((r) => r.round === 1);
  const r2 = rounds.find((r) => r.round === 2);
  if (!r1 || !r2) return [];
  const played = new Set(r1.games.flatMap((g) => [g.home.rosterId, g.away.rosterId]));
  return r2.games.flatMap((g) => [g.home.rosterId, g.away.rosterId]).filter((id): id is number => id != null && !played.has(id));
}

function Side({ side, game, mine, slot }: { side: BracketSide; game: BracketGame; mine: number | null; slot: (x: BracketSide) => string }) {
  const t = side.rosterId != null ? teamByRoster(side.rosterId) : undefined;
  const out = game.status === 'final' && !side.won && side.rosterId != null;
  return (
    <div className={`${s.bSide} ${out ? s.bOut : ''} ${side.rosterId == null ? s.bTbd : ''} ${side.rosterId === mine && mine != null ? s.prowMine : ''}`}>
      <span className={s.bSeed}>{side.seed ?? ''}</span>
      <span className={s.who}>
        <b>{side.rosterId != null ? (t?.teamName ?? side.team) : slot(side)}</b>
        {side.rosterId != null ? <small>{firstNameOf(side.rosterId) ?? side.manager}</small> : null}
      </span>
      {side.won ? <b className={s.win}>W</b> : <span />}
    </div>
  );
}

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th'];

/** What a game decides: the title, a place, or in the Shart Bowl, who chugs. */
function labelOf(g: BracketGame, shart: boolean) {
  if (g.placement == null) return null;
  if (shart) return g.placement === 1 ? 'Loser chugs' : null;
  return g.placement === 1 ? 'Championship' : `${ORD[g.placement] ?? g.placement} place`;
}

function Round({ round, all, mine, byes, shart = false }: { round: BracketRound; all: BracketRound[]; mine: number | null; byes: number[]; shart?: boolean }) {
  // An unplayed slot names the game it comes from: "Winner of Ben v Jeff".
  const byId = new Map(all.flatMap((r) => r.games.map((g) => [g.matchId, g] as const)));
  const name = (id: number | null) => (id != null ? (firstNameOf(id) ?? '') : '');
  const slot = (x: BracketSide) => {
    const m = x.from?.match(/^(Winner|Loser) of (\d+)$/);
    const g = m ? byId.get(Number(m[2])) : undefined;
    if (!m || !g) return x.from ?? 'To be decided';
    const a = name(g.home.rosterId);
    const b = name(g.away.rosterId);
    return `${m[1]} of ${a && b ? `${a} v ${b}` : a || b ? `${a || b}\u2019s game` : `game ${m[2]}`}`;
  };
  return (
    <div className={s.round}>
      <small>{round.name}</small>
      {round.games.map((g) => (
        <div key={g.matchId} className={s.bGame}>
          {labelOf(g, shart) ? <small className={s.bLabel}>{labelOf(g, shart)}</small> : null}
          <Side side={g.home} game={g} mine={mine} slot={slot} />
          <Side side={g.away} game={g} mine={mine} slot={slot} />
        </div>
      ))}
      {round.round === 1 && byes.length ? (
        <p className={s.note} style={{ padding: '0 4px' }}>
          Byes: {byes.map((id) => teamByRoster(id)?.teamName ?? '').filter(Boolean).join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The bracket. Before the playoffs it is the field as Sleeper would seed it
 * today; once they start it is the real thing, the champion on top, and the
 * Shart Bowl underneath for the bottom of the league.
 */
export default async function V4Bracket() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, post] = await Promise.all([getV4Data(mine), getPostseason().catch(() => NONE)]);
  const started = data.week >= league.playoffWeekStart;
  const champ = post.championRosterId != null ? teamByRoster(post.championRosterId) : undefined;
  const shart = post.shartRosterId != null ? teamByRoster(post.shartRosterId) : undefined;
  return (
    <Shell data={data} active="league">
      <SectionHead icon="trophy" word="bracket" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/league', label: 'League' }} />
      {champ ? (
        <section className={s.champ}>
          <Ms name="trophy" size={36} />
          <span>
            <small>Champion</small>
            <b>{champ.teamName}</b>
            {firstNameOf(champ.rosterId) ?? champ.manager}
          </span>
        </section>
      ) : null}
      <div className={s.title}>
        <h2>{started ? 'Playoffs' : 'If the Season Ended Today'}</h2>
      </div>
      {!started ? (
        <p className={s.note} style={{ padding: '0 4px', marginTop: -6 }}>
          Top {league.playoffTeams} make it. Playoffs start week {league.playoffWeekStart}.
        </p>
      ) : null}
      {post.rounds.length ? (
        post.rounds.map((r) => <Round key={r.round} round={r} all={post.rounds} mine={mine} byes={r.round === 1 ? post.byeRosterIds : []} />)
      ) : (
        <p className={s.empty}>Sleeper has not seeded a bracket yet.</p>
      )}
      {post.shartBowl.length ? (
        <>
          <div className={s.title}>
            <h2>The Shart Bowl</h2>
          </div>
          <p className={s.note} style={{ padding: '0 4px', marginTop: -6 }}>
            Losers bracket. The loser chugs{shart ? `: ${shart.teamName}, ${firstNameOf(shart.rosterId) ?? shart.manager}` : ''}.
          </p>
          {post.shartBowl.map((r) => (
            <Round key={r.round} round={r} all={post.shartBowl} mine={mine} byes={r.round === 1 ? byesOf(post.shartBowl) : []} shart />
          ))}
        </>
      ) : null}
    </Shell>
  );
}
