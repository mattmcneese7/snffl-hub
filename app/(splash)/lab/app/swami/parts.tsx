import type { ReactNode } from 'react';
import { league } from '@/lib/league';
import { model, modelIsCurrent } from '@/lib/model';
import type { MatchupRead } from '@/lib/outlook';
import { SITTING, type RosContext, type RosRead } from '@/lib/rest-of-season';
import { spine } from '@/lib/spine';
import { nflNickname, nflTeamName } from '../../../kit/nflTeams';
import { Ms, type MsName } from '../icons';
import w from './swami.module.css';

/**
 * What the trade checker and the waiver pickups share: a player's meta line,
 * his face, the working behind a rest of season number and how that number
 * is built. Every claim carries its number, and a number built from other
 * numbers shows what it was built from.
 */

export const fmt = (n: number) => n.toFixed(1);
export const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`;

/** Lib copy is written with straight apostrophes; on screen they curl. */
export const curl = (text: string) => text.replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’');

/** "K. Cousins", for the move text and dense rows. A defense keeps its name. */
export const short = (name: string, position?: string) => {
  if (position === 'DEF') return name;
  const [first, ...rest] = name.split(' ');
  return rest.length && !first.includes('.') ? `${first[0]}. ${rest.join(' ')}` : name;
};

/** Who he plays this week, "at Patriots". */
export function weekLine(m: Pick<MatchupRead, 'home' | 'opponent'> | null, team?: string | null): string {
  if (!team) return 'Free agent';
  return m ? `${m.home ? 'vs' : 'at'} ${nflNickname(m.opponent)}` : 'No game this week';
}

const sourceName = (read: RosRead) => (read.source === 'model' ? 'SNFFL model' : read.source === 'sleeper' ? 'Sleeper' : 'No source');

function sourceLabel(read: RosRead): string {
  const label = sourceName(read);
  return read.basis && read.basis.week !== league.state.week ? `${label}, week ${read.basis.week}` : label;
}

/** "Houston Texans, Out". A defense's name is its team, so it is not said twice. */
export function metaLine(read: RosRead, free = false): string {
  const p = read.player;
  const parts: string[] = [];
  if (p.position !== 'DEF') parts.push(p.team ? nflTeamName(p.team) : 'No NFL team');
  if (free) parts.push('FA');
  if (read.status) parts.push(read.status);
  return parts.join(', ');
}

export function Face({ read }: { read: RosRead }) {
  return (
    <span className={w.face}>
      <img src={read.player.headshot} alt="" loading="lazy" />
    </span>
  );
}

export function Pos({ pos }: { pos: string }) {
  return <i className={`${w.pos} ${w[`p${pos}`] ?? ''}`}>{pos}</i>;
}

/** One labeled figure: "Per week +2.4". */
export function Tag({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <span className={`${w.tag} ${tone === 'good' ? w.tagGood : tone === 'bad' ? w.tagBad : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
    </span>
  );
}

/** A card that opens and closes, its head always showing what it is. */
export function Panel({ icon, title, aside, open, children }: { icon: MsName; title: string; aside?: string; open?: boolean; children: ReactNode }) {
  return (
    <details className={w.panel} open={open}>
      <summary className={w.panelHead}>
        <span className={w.badge}>
          <Ms name={icon} size={18} />
        </span>
        <span className={w.panelTitle}>
          <b>{title}</b>
          {aside ? <small>{aside}</small> : null}
        </span>
        <Ms name="expand" size={22} className={w.chev} />
      </summary>
      <div className={w.panelBody}>{children}</div>
    </details>
  );
}

const weeksList = (weeks: number[]) => `${weeks.length === 1 ? 'Week' : 'Weeks'} ${weeks.join(', ')}`;

/** The working behind one player's rest of season number. */
export function RosWorking({ read }: { read: RosRead }) {
  if (read.noRead) return <p className={w.why}>{curl(read.noRead)}. He counts as zero.</p>;
  const by = read.source === 'model' ? 'the SNFFL model' : 'Sleeper';
  const outWeeks = read.weeks.filter((x) => x.out);
  return (
    <>
      <div className={w.tags}>
        <Tag label="Rest of season" value={read.total != null ? fmt(read.total) : 'No read'} />
        <Tag label="Per game" value={fmt(read.rate ?? 0)} />
        <Tag label="Source" value={sourceLabel(read)} />
        <Tag label="Games" value={read.games} />
        {read.byes.length ? <Tag label="Bye" value={weeksList(read.byes)} /> : null}
        {outWeeks.length && read.basis ? <Tag label="Out until" value={`Week ${read.basis.week}`} tone="bad" /> : null}
      </div>
      <p className={w.why}>
        {read.basis
          ? `${fmt(read.basis.points)} projected for week ${read.basis.week} by ${by} is his rate per game. Each week is that times the defense he faces.`
          : `Projected for nothing by ${by}, so every week is zero.`}
        {read.status && SITTING.has(read.status) && read.basis ? ` Listed ${read.status}; Sleeper has him back for week ${read.basis.week}.` : ''}
      </p>
      {read.weeks.length ? (
        <div className={w.cells}>
          {read.weeks.map((x) => (
            <span key={x.week} className={`${w.cell} ${!x.opponent || x.out ? w.cellQuiet : ''}`}>
              <small>W{x.week}</small>
              <span>{x.opponent ? `${x.home ? '' : '@'}${x.opponent}` : 'Bye'}</span>
              <span>{x.out ? 'Out' : x.opponent ? `×${x.factor.toFixed(2)}` : ' '}</span>
              <b>{fmt(x.points)}</b>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** How rest of season is worked out, with this week's figures in it. */
export function RosMethod({ ctx, extra }: { ctx: RosContext; extra?: ReactNode }) {
  const weight = Math.round(ctx.weight * 100);
  return (
    <details className={w.more}>
      <summary>
        How It&rsquo;s Worked Out
        <Ms name="expand" size={20} className={w.chev} />
      </summary>
      <div className={w.method}>
        <p>
          Each player&rsquo;s rate per game is this week&rsquo;s projection on this league&rsquo;s scoring: the SNFFL model where it has a current read,
          Sleeper&rsquo;s projection otherwise. Anyone on a bye or listed out takes Sleeper&rsquo;s projection for the first of the next two weeks he&rsquo;s
          expected to play, and counts zero until then. Every remaining week is that rate times the defense he faces, at {weight}% strength because{' '}
          {spine.throughWeek} weeks of games is only a {ctx.confidence} read on a defense. Each team&rsquo;s best lineup is rebuilt for every week, and the
          difference is what a move is worth.
        </p>
        <p>
          Counted: weeks {ctx.from} to {ctx.through}.{ctx.from > ctx.week ? ` Week ${ctx.week} is left out because its games have started.` : ''}
          {ctx.through < ctx.lastWeek ? ` The stored NFL schedule stops at week ${ctx.scheduleThrough}, so later weeks count once the nightly refresh reaches them.` : ''}
          {!modelIsCurrent() ? ` The model’s latest file is for week ${model.week}, not week ${ctx.week}, so every projection here is Sleeper’s until it catches up.` : ''}
        </p>
        <p>Not foreseen: injuries that haven&rsquo;t happened and depth charts that haven&rsquo;t changed. A player with no projection anywhere gets no read, never a guessed one.</p>
        {extra}
      </div>
    </details>
  );
}
