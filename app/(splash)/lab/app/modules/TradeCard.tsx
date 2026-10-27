import type { Trade } from '@/lib/trades';
import { teamByRoster } from '@/lib/league';
import { managerOf, shortName } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

/** One trade: the week and date, then each side and what it got. Players open the sheet. */
export function TradeRows({ trade, mine = null }: { trade: Trade; mine?: number | null }) {
  return (
    <div className={m.trade}>
      <div className={m.tradeTop}>
        <span>Week {trade.week}</span>
        <span>{trade.createdAt ? DAY.format(new Date(trade.createdAt)) : ''}</span>
      </div>
      {trade.sides.map((side) => {
        const team = teamByRoster(side.rosterId);
        const nothing = !side.gets.length && !side.picks.length && !side.faab;
        return (
          <div key={side.rosterId} className={`${m.side} ${side.rosterId === mine ? m.mine : ''}`}>
            <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: team?.colors?.primary }}>
              {team?.avatarUrl ? <img src={team.avatarUrl} alt="" /> : null}
            </span>
            <span className={s.who}>
              <b>{side.teamName.trim()}</b>
              <small>{managerOf(side.rosterId) || side.manager} gets</small>
              <span className={m.gets}>
                {side.gets.map((p) => (
                  <button key={p.id} type="button" data-player={p.id} className={m.get} aria-label={`${p.name}, open player`}>
                    <img src={p.headshot} alt="" loading="lazy" />
                    {shortName(p.name, p.position, p.team)}
                  </button>
                ))}
                {side.picks.map((pick) => (
                  <span key={pick} className={`${m.get} ${m.getX}`}>
                    {pick.replace(/^(\d{4}) round (\d+)$/, '$1 Round $2')}
                  </span>
                ))}
                {side.faab > 0 ? <span className={`${m.get} ${m.getX}`}>${side.faab} FAAB</span> : null}
                {nothing ? <span className={`${m.get} ${m.getX}`}>Nothing</span> : null}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
