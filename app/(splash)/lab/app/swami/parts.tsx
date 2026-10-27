import type { ReactNode } from 'react';
import { league } from '@/lib/league';
import { model, modelIsCurrent } from '@/lib/model';
import type { MatchupRead } from '@/lib/outlook';
import { SITTING, type RosContext, type RosRead } from '@/lib/rest-of-season';
import { spine } from '@/lib/spine';
import { nflNickname, nflTeamName } from '../../../kit/nflTeams';
import { Drawer, Face, ui as u } from '../ui';
import { Pos } from '../ui/blocks/Pos';
import StatGrid from '../players/StatGrid';
import w from './swami.module.css';

/**
 * What the trade checker and the waiver pickups share: a player's face and
 * meta line, the working behind a rest of season number and how that number
 * is built. Every claim carries its number, and a number built from other
 * numbers shows what it was built from.
 */

export const BASE = '/lab/app/swami';
export type Tab = 'players' | 'waivers' | 'trade';

/** A Swami link that keeps you on the same view. */
export const tabbed = (href: string, tab: Tab) => `${href}${href.includes('?') ? '&' : '?'}tab=${tab}`;

export const fmt = (n: number) => n.toFixed(1);
export const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`;

/** Lib copy is written with straight apostrophes; on screen they curl. */
export const curl = (text: string) => text.replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’');

/** "K. Cousins", for the move text and rows. A defense keeps its name. */
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

/** A player's face for a row: his headshot and club badge, or the club for a defense. */
export function PlayerFace({ read }: { read: RosRead }) {
  return <Face id={read.player.id} team={read.player.team} defense={read.player.position === 'DEF'} />;
}

/** The sub line of a player row: his position, then the meta line. */
export function PlayerSub({ read, free = false }: { read: RosRead; free?: boolean }) {
  const meta = metaLine(read, free);
  return (
    <>
      <Pos position={read.player.position} />
      {meta ? ` ${meta}` : ''}
    </>
  );
}

const weeksList = (weeks: number[]) => `${weeks.length === 1 ? 'week' : 'weeks'} ${weeks.join(', ')}`;

/** The working behind one player's rest of season number. */
export function RosWorking({ read }: { read: RosRead }) {
  if (read.noRead) return <p className={u.bodyText}>{curl(read.noRead)}. He counts as zero.</p>;
  const by = read.source === 'model' ? 'the SNFFL model' : 'Sleeper';
  const outWeeks = read.weeks.filter((x) => x.out);
  const notes = [
    `Source: ${sourceLabel(read)}.`,
    read.byes.length ? `Bye ${weeksList(read.byes)}.` : '',
    outWeeks.length && read.basis ? `Out until week ${read.basis.week}.` : '',
  ].filter(Boolean);
  return (
    <div className={w.stack}>
      <StatGrid
        items={[
          { value: read.total != null ? fmt(read.total) : 'No read', label: 'Rest of season' },
          { value: fmt(read.rate ?? 0), label: 'Per game' },
          { value: read.games, label: 'Games' },
        ]}
      />
      <p className={`${u.sub} ${w.note}`}>
        {read.basis
          ? `${fmt(read.basis.points)} projected for week ${read.basis.week} by ${by} is his rate per game. Each week is that times the defense he faces.`
          : `Projected for nothing by ${by}, so every week is zero.`}
        {read.status && SITTING.has(read.status) && read.basis ? ` Listed ${read.status}; Sleeper has him back for week ${read.basis.week}.` : ''} {notes.join(' ')}
      </p>
      {read.weeks.length ? (
        <StatGrid
          per={4}
          items={read.weeks.map((x) => ({
            value: fmt(x.points),
            label: `W${x.week} ${x.opponent ? `${x.home ? '' : '@'}${x.opponent}` : 'Bye'}${x.out ? ' Out' : x.opponent ? ` ×${x.factor.toFixed(2)}` : ''}`,
          }))}
        />
      ) : null}
    </div>
  );
}

/** How rest of season is worked out, with this week's figures in it. */
export function RosMethod({ ctx, extra }: { ctx: RosContext; extra?: ReactNode }) {
  const weight = Math.round(ctx.weight * 100);
  return (
    <Drawer title="How It Works">
      <div className={w.drawerBody}>
        <p className={u.bodyText}>
          Each player&rsquo;s rate per game is this week&rsquo;s projection on this league&rsquo;s scoring: the SNFFL model where it has a current read,
          Sleeper&rsquo;s projection otherwise. Anyone on a bye or listed out takes Sleeper&rsquo;s projection for the first of the next two weeks he&rsquo;s
          expected to play, and counts zero until then. Every remaining week is that rate times the defense he faces, at {weight}% strength because{' '}
          {spine.throughWeek} weeks of games is only a {ctx.confidence} read on a defense. Each team&rsquo;s best lineup is rebuilt for every week, and the
          difference is what a move is worth.
        </p>
        <p className={u.bodyText}>
          Counted: weeks {ctx.from} to {ctx.through}.{ctx.from > ctx.week ? ` Week ${ctx.week} is left out because its games have started.` : ''}
          {ctx.through < ctx.lastWeek ? ` The stored NFL schedule stops at week ${ctx.scheduleThrough}, so later weeks count once the nightly refresh reaches them.` : ''}
          {!modelIsCurrent() ? ` The model’s latest file is for week ${model.week}, not week ${ctx.week}, so every projection here is Sleeper’s until it catches up.` : ''}
        </p>
        <p className={u.bodyText}>Not foreseen: injuries that haven&rsquo;t happened and depth charts that haven&rsquo;t changed. A player with no projection anywhere gets no read, never a guessed one.</p>
        {extra}
      </div>
    </Drawer>
  );
}
