import Link from 'next/link';
import { league } from '@/lib/league';
import { model, modelIsCurrent } from '@/lib/model';
import { SITTING, type RosContext, type RosRead } from '@/lib/rest-of-season';
import { spine } from '@/lib/spine';

/**
 * The working behind a rest of season number, shown rather than asserted.
 *
 * The Swami's rule is that every claim carries its number. For a number that
 * is itself built from other numbers, that means showing what it was built
 * from: the projection it started at, the defence that was taken out, the rate
 * left behind, and each week it was carried into.
 */

const sourceName = (read: RosRead) =>
  read.source === 'model' ? 'SNFFL model' : read.source === 'sleeper' ? 'Sleeper' : 'no source';

export function sourceLabel(read: RosRead): string {
  const label = sourceName(read);
  // A rate borrowed from a later week says which, since it is not this week's.
  return read.basis && read.basis.week !== league.state.week
    ? `${label}, week ${read.basis.week}`
    : label;
}

const fmt = (n: number) => n.toFixed(1);

export function RosPlayerWorking({ read }: { read: RosRead }) {
  const { player } = read;
  return (
    <div className="snffl-swami-work">
      <div className="snffl-swami-work-head">
        <Link className="snffl-swami-name" href={`/players/${player.id}`}>
          <strong>{player.name}</strong>
          <em>
            {player.position} · {player.team ?? 'FA'}
            {read.status ? ` · ${read.status}` : ''}
          </em>
        </Link>
        <strong className="snffl-swami-work-total">
          {read.total != null ? fmt(read.total) : 'no read'}
        </strong>
      </div>
      {read.noRead ? (
        <p className="snffl-swami-work-sub">{read.noRead}.</p>
      ) : (
        <>
          <p className="snffl-swami-work-sub">
            {read.basis
              ? `${fmt(read.basis.points)} projected for week ${read.basis.week} by ${read.source === 'model' ? 'the SNFFL model' : 'Sleeper'} is his rate per game, and each week below is that times the defence he faces.`
              : `Projected for nothing by ${read.source === 'model' ? 'the SNFFL model' : 'Sleeper'}.`}{' '}
            {read.games} {read.games === 1 ? 'game' : 'games'}
            {read.byes.length ? `, bye in week ${read.byes.join(', ')}` : ''}
            {read.weeks.some((w) => w.out) ? `, out until week ${read.basis?.week}` : ''}.
            {read.status && SITTING.has(read.status) && read.basis
              ? ` Listed ${read.status}: Sleeper has him back for week ${read.basis.week}, and that is taken at its word.`
              : ''}
          </p>
          {read.weeks.length ? (
            <details className="snffl-swami-fx-wrap">
              <summary>Week by week</summary>
              <div className="snffl-swami-fx">
                {read.weeks.map((w) => (
                  <span key={w.week} className="snffl-swami-fx-cell">
                    <em>{w.week}</em>
                    {w.opponent ? `${w.home ? '' : '@'}${w.opponent}` : 'bye'}
                    {w.opponent && !w.out ? <i>×{w.factor.toFixed(2)}</i> : null}
                    {w.out ? <i>out</i> : null}
                    <strong>{fmt(w.points)}</strong>
                  </span>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

/** How rest of season is worked out, in the reader's terms, with this week's figures in it. */
export function RosMethod({ ctx }: { ctx: RosContext }) {
  const weight = Math.round(ctx.weight * 100);
  return (
    <div className="snffl-swami-method">
      <span className="snffl-label">How rest of season is worked out</span>
      <p>
        Each player&apos;s rate per game is this week&apos;s projection on this league&apos;s
        scoring: the SNFFL model where it has a current read, Sleeper&apos;s projection run through
        our scoring otherwise. For anyone on a bye or listed out, it is Sleeper&apos;s projection
        for the first of the next two weeks he is expected to play, and he counts zero until then. Every remaining week is that rate times the defence he faces, applied at {weight}%
        strength because {spine.throughWeek} weeks of games is only a {ctx.confidence} read on a
        defence. A bye scores zero. Each team&apos;s best lineup is then rebuilt for every week,
        slot by slot, and the difference is what a move is worth.
      </p>
      <p>
        Counted: weeks {ctx.from} to {ctx.through}.
        {ctx.from > ctx.week ? ` Week ${ctx.week} is left out because its games have started.` : ''}
        {ctx.through < ctx.lastWeek
          ? ` The stored NFL schedule stops at week ${ctx.scheduleThrough}, so weeks after it are not counted until the nightly refresh reaches them.`
          : ''}
        {!modelIsCurrent()
          ? ` The model's latest file is for week ${model.week}, not week ${ctx.week}, so every projection here is Sleeper's until it catches up.`
          : ''}
      </p>
      <p>
        Not foreseen: injuries that have not happened, depth charts that have not changed, and when
        anybody hurt now comes back beyond what Sleeper projects for the next two weeks. A player with no
        projection anywhere gets no read, never a guessed one.
      </p>
    </div>
  );
}
