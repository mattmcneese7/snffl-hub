import type { Metadata } from 'next';
import Link from 'next/link';
import Chrome from '@/components/Chrome';
import PageHead from '@/components/PageHead';
import { PageSources } from '@/components/SourceMark';
import { firstNameOf } from '@/config/managers';
import { allPlayers, league, teamByRoster } from '@/lib/league';
import { outlookFor, roleOf } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { getRosters } from '@/lib/sleeper';
import { dvpConfidence, POSITIONS, spine, type Pos } from '@/lib/spine';

export const metadata: Metadata = { title: 'The Swami' };
export const revalidate = 900;

/**
 * The research bench.
 *
 * Squirt Says judges a lineup you already set and the matchup panels read a
 * game already under way. This is the screen for before either: every player
 * the league can reach, with the projection on this league's rules, the
 * defence he is walking into, and the usage that says whether the projection
 * is describing a role or a fluke.
 *
 * Filtering runs through the URL rather than through state, which is what
 * makes a filtered view something a manager can paste into the group chat.
 */

type Search = { pos?: string; own?: string };

const OWNERSHIP = [
  { key: 'all', label: 'Everyone' },
  { key: 'rostered', label: 'Rostered' },
  { key: 'free', label: 'Free agents' },
] as const;

export default async function SwamiPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const pos = (POSITIONS as readonly string[]).includes(params.pos ?? '')
    ? (params.pos as Pos)
    : null;
  const own = OWNERSHIP.some((o) => o.key === params.own) ? params.own! : 'all';
  const week = league.state.week;

  const [projections, rosters] = await Promise.all([
    getWeekProjections(league.state.season, week),
    getRosters().catch(() => []),
  ]);

  /** Who owns whom, so a free agent can be told from a starter. */
  const ownerOf = new Map<string, number>();
  for (const roster of rosters) {
    for (const id of roster.players ?? []) ownerOf.set(id, roster.roster_id);
  }

  const rows = allPlayers()
    .filter((player) => !pos || player.position === pos)
    .filter((player) => {
      if (own === 'rostered') return ownerOf.has(player.id);
      if (own === 'free') return !ownerOf.has(player.id);
      return true;
    })
    .map((player) => {
      const base = projections[player.id] ?? 0;
      return {
        player,
        owner: ownerOf.get(player.id) ?? null,
        outlook: outlookFor(player.id, player.position, player.team, base, week),
        role: roleOf(player.id, player.position),
      };
    })
    // Somebody projected for nothing is not research, he is the rest of the
    // player database.
    .filter((row) => row.outlook.adjusted > 0 || row.outlook.usage)
    .sort((a, b) => b.outlook.adjusted - a.outlook.adjusted)
    .slice(0, 60);

  // The defence table for whichever position is being looked at. Receivers by
  // default, because that is the position a lineup has most of.
  const grid = pos && pos !== 'DEF' ? pos : 'WR';
  const defenses = Object.entries(spine.dvp)
    .filter(([, byPos]) => byPos[grid])
    .map(([team, byPos]) => ({ team, entry: byPos[grid]! }))
    .sort((a, b) => a.entry.rank - b.entry.rank);

  const href = (next: Partial<Search>) => {
    const q = new URLSearchParams();
    const p = next.pos ?? pos ?? '';
    const o = next.own ?? own;
    if (p) q.set('pos', p);
    if (o !== 'all') q.set('own', o);
    const s = q.toString();
    return s ? `/swami?${s}` : '/swami';
  };

  return (
    <>
      <Chrome section="The Swami" />
      <main className="snffl-page">
        <PageHead title="The Swami" />

        <section>
          <div className="snffl-swami-filters">
            <div className="snffl-swami-filter-row">
              <Link className={`snffl-swami-filter${!pos ? ' snffl-swami-filter-on' : ''}`} href={href({ pos: '' })}>
                All
              </Link>
              {POSITIONS.map((p) => (
                <Link
                  key={p}
                  className={`snffl-swami-filter${pos === p ? ' snffl-swami-filter-on' : ''}`}
                  href={href({ pos: p })}
                >
                  {p}
                </Link>
              ))}
            </div>
            <div className="snffl-swami-filter-row">
              {OWNERSHIP.map((o) => (
                <Link
                  key={o.key}
                  className={`snffl-swami-filter${own === o.key ? ' snffl-swami-filter-on' : ''}`}
                  href={href({ own: o.key })}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Week {week}</h2>
            <span className="snffl-block-heading-link">{rows.length} shown</span>
          </div>

          <div className="snffl-card snffl-swami-table">
            {rows.map(({ player, outlook, role, owner }) => {
              const team = owner ? teamByRoster(owner) : null;
              const m = outlook.matchup;
              return (
                <Link key={player.id} className="snffl-swami-player" href={`/players/${player.id}`}>
                  <span className="snffl-swami-name">
                    <strong>{player.name}</strong>
                    <em>
                      {player.position} · {player.team ?? 'FA'}
                      {team ? ` · ${firstNameOf(team.rosterId) ?? team.manager}` : ' · free'}
                    </em>
                  </span>

                  <span className="snffl-swami-proj">
                    <strong>{outlook.adjusted.toFixed(1)}</strong>
                    <em>
                      {outlook.floor.toFixed(0)}-{outlook.ceiling.toFixed(0)}
                    </em>
                  </span>

                  <span className="snffl-swami-meta">
                    {m ? (
                      <span className={`snffl-swami-edge snffl-outlook-${m.label}`}>
                        {m.home ? '' : '@'}
                        {m.opponent} {m.label}
                      </span>
                    ) : (
                      <span className="snffl-swami-edge">no game</span>
                    )}
                    {outlook.usage ? (
                      <em>
                        {Math.round(outlook.usage.snapShare * 100)}% snaps
                        {role ? ` · ${role}` : ''}
                      </em>
                    ) : (
                      <em>no usage yet</em>
                    )}
                  </span>
                </Link>
              );
            })}
            {!rows.length ? <p className="snffl-swami-empty">Nobody matches that.</p> : null}
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Defences vs {grid}</h2>
            <span className="snffl-block-heading-link">
              through week {spine.throughWeek}
            </span>
          </div>
          <div className="snffl-card snffl-swami-dvp">
            {defenses.map(({ team, entry }) => (
              <span key={team} className="snffl-swami-def">
                <em>{entry.rank}</em>
                <strong>{team}</strong>
                <span>{entry.adjusted.toFixed(1)}</span>
              </span>
            ))}
          </div>
          {dvpConfidence() === 'thin' ? (
            <p className="snffl-swami-caveat">
              Shrunk hard toward the league average, because {spine.throughWeek} games is not a
              read on a defence. The raw spread is wider than this and less honest.
            </p>
          ) : null}
        </section>

        <PageSources
          items={[
            { source: 'sleeper', label: 'Projections' },
            { source: 'sleeper', label: 'Stats' },
            { source: 'snffl', label: 'Matchup ratings' },
          ]}
        />
      </main>
    </>
  );
}
