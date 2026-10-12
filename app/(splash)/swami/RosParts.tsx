import type { ReactNode } from 'react';
import { league } from '@/lib/league';
import { model, modelIsCurrent } from '@/lib/model';
import { SITTING, type RosContext, type RosRead } from '@/lib/rest-of-season';
import { spine } from '@/lib/spine';
import { nflTeamName } from '../kit/nflTeams';
import w from '../home/widgets.module.css';
import s from './swami.module.css';
import m from './moves.module.css';

/**
 * Pieces the trade evaluator and the waiver pickups share: a player's meta
 * line, his face, the working behind a rest of season number, and how that
 * number is worked out. The Swami's rule is that every claim carries its
 * number, and a number built from other numbers shows what it was built from.
 */

export const fmt = (n: number) => n.toFixed(1);
export const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`;

/** Lib copy is written with straight apostrophes; on screen they curl. */
export const curl = (text: string) => text.replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’');

const sourceName = (read: RosRead) =>
  read.source === 'model' ? 'SNFFL model' : read.source === 'sleeper' ? 'Sleeper' : 'No source';

/** Where his rate came from, and which week when it is not this one. */
export function sourceLabel(read: RosRead): string {
  const label = sourceName(read);
  return read.basis && read.basis.week !== league.state.week ? `${label}, week ${read.basis.week}` : label;
}

/** "WR, Houston Texans, FA, Out". A defense's name is its team, so it is not said twice. */
export function metaLine(read: RosRead, free = false): string {
  const p = read.player;
  const parts = [p.position];
  if (p.position !== 'DEF') parts.push(p.team ? nflTeamName(p.team) : 'No NFL team');
  if (free) parts.push('FA');
  if (read.status) parts.push(read.status);
  return parts.join(', ');
}

export function Face({ read, className }: { read: RosRead; className: string }) {
  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={read.player.headshot} alt="" loading="lazy" />
    </span>
  );
}

const weeksList = (weeks: number[]) => `${weeks.length === 1 ? 'Week' : 'Weeks'} ${weeks.join(', ')}`;

/** One chip: a label and its value. */
export function Chip({ label, value, hot, plain }: { label: string; value: ReactNode; hot?: boolean; plain?: boolean }) {
  return (
    <span className={`${w.chip} ${hot ? w.chipHot : plain ? s.chipEven : ''}`}>
      {label} | {value}
    </span>
  );
}

/** The working behind one player's rest of season number. */
export function RosWorking({ read }: { read: RosRead }) {
  if (read.noRead) return <p className={m.why}>{curl(read.noRead)}. He counts as zero.</p>;
  const by = read.source === 'model' ? 'the SNFFL model' : 'Sleeper';
  const outWeeks = read.weeks.filter((x) => x.out);
  return (
    <>
      <span className={s.tags}>
        <Chip label="Rest of season" value={read.total != null ? fmt(read.total) : 'No read'} />
        <Chip label="Rate" value={`${fmt(read.rate ?? 0)} a game`} plain />
        <Chip label="Source" value={sourceLabel(read)} plain />
        <Chip label="Games" value={read.games} plain />
        {read.byes.length ? <Chip label="Bye" value={weeksList(read.byes)} plain /> : null}
        {outWeeks.length && read.basis ? <Chip label="Out until" value={`Week ${read.basis.week}`} plain /> : null}
      </span>
      <p className={m.why}>
        {read.basis
          ? `${fmt(read.basis.points)} projected for week ${read.basis.week} by ${by} is his rate per game. Each week is that times the defense he faces, so the weeks add up to his total.`
          : `Projected for nothing by ${by}, so every week is zero.`}
        {read.status && SITTING.has(read.status) && read.basis
          ? ` Listed ${read.status}: Sleeper has him back for week ${read.basis.week}, and that is taken at its word.`
          : ''}
      </p>
      {read.weeks.length ? (
        <span className={m.cells}>
          {read.weeks.map((x) => (
            <span key={x.week} className={`${m.cell} ${!x.opponent || x.out ? m.cellQuiet : ''}`}>
              <span className={m.cellWeek}>W{x.week}</span>
              <span className={m.cellOpp}>{x.opponent ? `${x.home ? '' : '@'}${x.opponent}` : 'Bye'}</span>
              <span>{x.out ? 'Out' : x.opponent ? `×${x.factor.toFixed(2)}` : ' '}</span>
              <b>{fmt(x.points)}</b>
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}

/** How rest of season is worked out, in the reader's terms, with this week's figures in it. */
export function RosMethod({ ctx, extra }: { ctx: RosContext; extra?: ReactNode }) {
  const weight = Math.round(ctx.weight * 100);
  return (
    <details className={m.weeksWrap}>
      <summary>
        How it&rsquo;s worked out
        <span className={m.chev} aria-hidden />
      </summary>
      <div className={m.method}>
        <p>
          Each player&rsquo;s rate per game is this week&rsquo;s projection on this league&rsquo;s scoring: the SNFFL
          model where it has a current read, Sleeper&rsquo;s projection run through our scoring otherwise. Anyone on a
          bye or listed out takes Sleeper&rsquo;s projection for the first of the next two weeks he&rsquo;s expected to
          play, and counts zero until then. Every remaining week is that rate times the defense he faces, at {weight}%
          strength because {spine.throughWeek} weeks of games is only a {ctx.confidence} read on a defense. A bye
          scores zero. Each team&rsquo;s best lineup is then rebuilt for every week, slot by slot, and the difference
          is what a move is worth.
        </p>
        <p>
          Counted: weeks {ctx.from} to {ctx.through}.
          {ctx.from > ctx.week ? ` Week ${ctx.week} is left out because its games have started.` : ''}
          {ctx.through < ctx.lastWeek
            ? ` The stored NFL schedule stops at week ${ctx.scheduleThrough}, so later weeks aren’t counted until the nightly refresh reaches them.`
            : ''}
          {!modelIsCurrent()
            ? ` The model’s latest file is for week ${model.week}, not week ${ctx.week}, so every projection here is Sleeper’s until it catches up.`
            : ''}
        </p>
        <p>
          Not foreseen: injuries that haven&rsquo;t happened, depth charts that haven&rsquo;t changed, and when anybody
          hurt now comes back beyond what Sleeper projects for the next two weeks. A player with no projection
          anywhere gets no read, never a guessed one.
        </p>
        {extra}
      </div>
    </details>
  );
}
