import type { ReactNode } from 'react';
import type { FeatureData } from '@/components/FeatureMatchup';
import { LiveTeamPoints } from '@/components/LiveScores';
import type { LineupSlot } from '@/lib/types';
import Icon, { type IconName } from '../../home/Icons';
import w from '../../home/widgets.module.css';
import type { Lore } from './lore';
import { Drop, pts, WinBar } from './shared';
import s from '../sb.module.css';

/**
 * A matchup as a score bug, the Home's Matchup card on this page: one row a
 * team, avatar, team and manager, score on the right with where it is
 * heading under it, then the model's chance to win as one bar. `big` is the
 * matchup page's hero; the Scoreboard's Your game is the normal size.
 * Scores tick live from Sleeper while a game is on.
 */
export default function ScoreCard({
  f,
  title,
  icon = 'helmet',
  big = false,
  carry,
  lore,
  foot,
  h1 = false,
  back,
}: {
  f: FeatureData;
  title: string;
  icon?: IconName;
  big?: boolean;
  carry?: Record<number, LineupSlot>;
  lore?: (rosterId: number) => Lore;
  foot?: ReactNode;
  /** On the matchup page the card is the page: its title is the h1. */
  h1?: boolean;
  /** A way back, inside the card's top, when the card opens the page. */
  back?: ReactNode;
}) {
  const Title = h1 ? 'h1' : 'span';
  const { away, home } = f;
  const live = Boolean(f.inPlay);
  const hasModel = away.winProb != null && home.winProb != null && f.status !== 'final';
  const final = f.status === 'final';
  return (
    <section className={`${w.widget} ${w.l} ${s.card} ${s.tick} ${big ? s.big : ''}`}>
      {back}
      <div className={w.head}>
        <Icon name={icon} className={w.headIcon} />
        <Title className={`${w.title} ${s.h1}`}>{title}</Title>
        <span className={w.aside}>
          {live ? (
            <span className={s.liveTag}>
              <Drop />
              On the field
            </span>
          ) : (
            <span className={s.state}>{final ? 'Final' : f.status === 'live' ? 'In progress' : 'Upcoming'}</span>
          )}
        </span>
      </div>

      <div className={s.cRows}>
        {[away, home].map((side, i, both) => {
          // Level and above zero, both are leading; nobody is at 0 to 0.
          const lead = side.points > both[1 - i].points || (side.points === both[1 - i].points && side.points > 0);
          const ahead: string[] = [];
          if (!final && side.projected != null) ahead.push(`Projected ${side.projected.toFixed(1)}`);
          if (f.status === 'live') ahead.push(`${side.yetToPlay} to play`);
          if (side.inPlay) ahead.push(`${side.inPlay} on now`);
          const chips = lore?.(side.rosterId).slice(0, 2) ?? [];
          const c = carry?.[side.rosterId];
          return (
            <div key={side.rosterId} className={s.cRow}>
              <span className={s.cAvatar}>
                {side.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={side.avatarUrl} alt="" />
                ) : null}
              </span>
              <span className={s.cWho}>
                <span className={s.cTeam}>{side.teamName}</span>
                <span className={s.sub}>
                  {side.manager}
                  {side.record ? `, ${side.record}` : ''}
                </span>
                {c ? (
                  <span className={s.carry}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.headshot} alt="" loading="lazy" />
                    <b>{c.name}</b> {pts(c.points)}
                  </span>
                ) : null}
                {chips.length ? (
                  <span className={s.mLine} style={{ marginTop: 4 }}>
                    {chips.map((l) => (
                      <span key={l.text} className={`${s.chip} ${l.hot ? s.chipHot : ''}`}>
                        {l.text}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <span className={s.cRight}>
                <LiveTeamPoints rosterId={side.rosterId} week={f.week} fallback={side.points} className={`${s.cScore} ${lead ? s.cWin : ''}`} />
                {ahead.map((line) => (
                  <span key={line} className={s.sub}>
                    {line}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {hasModel ? <WinBar away={away.winProb!} caption="Chance to win" /> : null}

      {foot ? <div className={s.cFoot}>{foot}</div> : null}
    </section>
  );
}
