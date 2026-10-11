import Link from 'next/link';
import SwamiSelect from '@/components/SwamiSelect';
import { RosMethod, sourceLabel } from '@/components/SwamiWorking';
import { firstNameOf } from '@/config/managers';
import { teams } from '@/lib/league';
import type { RosBoard } from '@/lib/ros-load';
import type { RosRead } from '@/lib/rest-of-season';
import type { UsageEntry } from '@/lib/spine';
import { candidatePool, waiversForTeam, waiversLeagueWide } from '@/lib/waivers';

/**
 * Waiver suggestions, a view of the Swami.
 *
 * With a team in the URL, or picked on this device, it is that team's list:
 * every unrostered player ranked by what he adds to that team's best lineup.
 * Without one it is the league's: who would start for the most teams.
 */

export type WaiverParams = { team: number | 'league' | null; pos: string | null };

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export function waiverHref(p: WaiverParams) {
  const q = new URLSearchParams({ view: 'waivers' });
  if (p.team) q.set('team', String(p.team));
  if (p.pos) q.set('pos', p.pos);
  return `/swami?${q.toString()}`;
}

const fmt = (n: number) => n.toFixed(1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Snap share, with the last three weeks beside it when they moved. */
function UsageNote({
  usage,
  trend,
  position,
}: {
  usage: UsageEntry | null;
  trend: string | null;
  position: string;
}) {
  // A kicker's or a defence's snap share says nothing about his role.
  if (position === 'K' || position === 'DEF') return null;
  if (!usage) return <em>no usage yet</em>;
  if (usage.recent && trend && trend !== 'steady') {
    return (
      <em className={trend === 'rising' ? 'snffl-swami-up' : 'snffl-swami-down'}>
        snaps {pct(usage.snapShare)}, last {usage.recent.weeks}{' '}
        {usage.recent.weeks === 1 ? 'game' : 'games'} {pct(usage.recent.snapShare)}{' '}
        {trend === 'rising' ? '↑' : '↓'}
      </em>
    );
  }
  return <em>snaps {pct(usage.snapShare)}</em>;
}

function Meta({ read }: { read: RosRead }) {
  return (
    <em>
      {read.player.position} · {read.player.team ?? 'FA'}
      {read.status ? ` · ${read.status}` : ''} ·{' '}
      {fmt(read.rate ?? 0)} a game · {read.games} games
      {read.byes.length ? `, bye ${read.byes.join(', ')}` : ''} · {sourceLabel(read)}
    </em>
  );
}

export default function SwamiWaivers({
  board,
  params,
}: {
  board: RosBoard;
  params: WaiverParams;
}) {
  const { ctx, rosters, readOf, unrostered } = board;
  const pool = candidatePool(unrostered.map((p) => readOf(p.id)), params.pos);
  const team = typeof params.team === 'number' ? params.team : null;

  const teamOptions = [
    { value: 'league', label: 'The whole league', href: waiverHref({ ...params, team: 'league' }) },
    ...teams.map((t) => ({
      value: String(t.rosterId),
      label: `${t.teamName} (${firstNameOf(t.rosterId) ?? t.manager})`,
      href: waiverHref({ ...params, team: t.rosterId }),
    })),
  ];

  const posLinks = (
    <div className="snffl-swami-filter-row">
      <Link
        className={`snffl-swami-filter${!params.pos ? ' snffl-swami-filter-on' : ''}`}
        href={waiverHref({ ...params, pos: null })}
        scroll={false}
      >
        All
      </Link>
      {POSITIONS.map((p) => (
        <Link
          key={p}
          className={`snffl-swami-filter${params.pos === p ? ' snffl-swami-filter-on' : ''}`}
          href={waiverHref({ ...params, pos: p })}
          scroll={false}
        >
          {p}
        </Link>
      ))}
    </div>
  );

  const readsFor = (rosterId: number) =>
    (rosters.find((r) => r.roster_id === rosterId)?.players ?? []).map(readOf);

  const teamView = team
    ? waiversForTeam({ rosterId: team, roster: readsFor(team), pool, ctx })
    : null;
  const leagueView = team
    ? null
    : waiversLeagueWide({
        rosters: rosters.map((r) => ({ rosterId: r.roster_id, reads: (r.players ?? []).map(readOf) })),
        pool,
        ctx,
      });

  const weakSlots = new Set(
    (teamView?.picks ?? []).slice(0, 3).flatMap((p) => (p.replaces ? [p.replaces.read.player.id] : []))
  );

  return (
    <>
      <section>
        <div className="snffl-block-heading">
          <h2 className="snffl-headline">Waiver Wire</h2>
          <span className="snffl-block-heading-link">
            {ctx.through >= ctx.from ? `weeks ${ctx.from} to ${ctx.through}` : 'season over'}
          </span>
        </div>
        <div className="snffl-swami-filters">
          <SwamiSelect
            id="snffl-swami-waiver-team"
            label="Suggestions for"
            value={team ? String(team) : 'league'}
            options={teamOptions}
          />
          {posLinks}
        </div>
      </section>

      {teamView ? (
        <>
          <section>
            {teamView.line ? (
              <div className="snffl-card snffl-swami-verdict">
                <p className="snffl-swami-line">{teamView.line}</p>
              </div>
            ) : (
              <p className="snffl-swami-caveat">
                Nothing unrostered{params.pos ? ` at ${params.pos}` : ''} improves{' '}
                {teamView.manager}&apos;s best lineup in any week from {ctx.from} to {ctx.through}.
              </p>
            )}
          </section>

          {teamView.picks.length ? (
            <section>
              <div className="snffl-block-heading">
                <h2 className="snffl-headline">Best Adds for {teamView.manager}</h2>
                <span className="snffl-block-heading-link">lineup points added</span>
              </div>
              <div className="snffl-card snffl-swami-table">
                {teamView.picks.map((p) => (
                  <Link
                    key={p.read.player.id}
                    className="snffl-swami-player"
                    href={`/players/${p.read.player.id}`}
                  >
                    <span className="snffl-swami-name">
                      <strong>{p.read.player.name}</strong>
                      <Meta read={p.read} />
                    </span>
                    <span className="snffl-swami-proj">
                      <strong className="snffl-swami-up">+{fmt(p.rosGain)}</strong>
                      <em>{p.perGame > 0 ? `+${fmt(p.perGame)} a game` : 'spot starts'}</em>
                    </span>
                    <span className="snffl-swami-meta">
                      {p.replaces ? (
                        <span className="snffl-swami-edge">
                          over {p.replaces.read.player.short || p.replaces.read.player.name} at{' '}
                          {p.replaces.slot}
                        </span>
                      ) : null}
                      {p.thisWeek != null ? (
                        <span className="snffl-swami-edge">
                          {p.thisWeek > 0 ? `+${fmt(p.thisWeek)} this week` : 'no help this week'}
                        </span>
                      ) : null}
                      <UsageNote usage={p.usage} trend={p.trend} position={p.read.player.position} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">Measured Against</h2>
              <span className="snffl-block-heading-link">a typical week, per game</span>
            </div>
            <div className="snffl-card snffl-swami-lineup">
              {teamView.lineup.map((slot, i) => (
                <span
                  key={`${slot.slot}-${i}`}
                  className={`snffl-swami-slot${slot.id && weakSlots.has(slot.id) ? ' snffl-swami-slot-weak' : ''}`}
                >
                  <em>{slot.slot}</em>
                  <strong>{slot.read?.player.name ?? 'Empty'}</strong>
                  <span>{fmt(slot.points)}</span>
                </span>
              ))}
            </div>
            <p className="snffl-swami-caveat">
              {teamView.manager}&apos;s best lineup at per game rates, byes and matchups aside.
              Marked slots are the ones the top suggestions replace. The headline numbers above do
              count byes and matchups, week by week.
            </p>
          </section>
        </>
      ) : null}

      {leagueView ? (
        <section>
          {leagueView.line ? (
            <div className="snffl-card snffl-swami-verdict">
              <p className="snffl-swami-line">{leagueView.line}</p>
            </div>
          ) : null}
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Best Available</h2>
            <span className="snffl-block-heading-link">to the average lineup</span>
          </div>
          <div className="snffl-card snffl-swami-table">
            {leagueView.picks.map((p) => (
              <Link
                key={p.read.player.id}
                className="snffl-swami-player"
                href={`/players/${p.read.player.id}`}
              >
                <span className="snffl-swami-name">
                  <strong>{p.read.player.name}</strong>
                  <Meta read={p.read} />
                </span>
                <span className="snffl-swami-proj">
                  <strong className="snffl-swami-up">+{fmt(p.meanGain)}</strong>
                  <em>
                    starts for {p.startsFor} of {rosters.length}
                  </em>
                </span>
                <span className="snffl-swami-meta">
                  {p.best ? (
                    <span className="snffl-swami-edge">
                      most to {p.best.manager}, +{fmt(p.best.gain)}
                    </span>
                  ) : null}
                  <UsageNote usage={p.usage} trend={p.trend} position={p.read.player.position} />
                </span>
              </Link>
            ))}
            {!leagueView.picks.length ? (
              <p className="snffl-swami-empty">Nobody on the wire improves any lineup.</p>
            ) : null}
          </div>
          <p className="snffl-swami-caveat">
            The big number is what he adds to a lineup over {leagueView.window}, averaged across all{' '}
            {rosters.length} teams, zeros included. Starts for counts the teams whose best lineup he
            would crack in a typical week. Pick a team above for its own list.
          </p>
        </section>
      ) : null}

      <RosMethod ctx={ctx} />
      <p className="snffl-swami-caveat">
        Usage is shown, not multiplied in: the model already reads recent snap and target share, so
        scaling it again by a trend would count the same evidence twice. A snap share arrow means
        the last three weeks moved ten points or more against his season.
      </p>
    </>
  );
}
