import type { Trade } from '@/lib/trades';
import { teamByRoster } from '@/lib/league';
import { managerOf, shortName } from './shared';
import { Avatar, Face, Label, Tag, ui } from '../ui';
import l from './layout.module.css';

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

/** One trade as one row of a list: the week and date, then each side and what it got. Players open the sheet. */
export function TradeRows({ trade, mine = null }: { trade: Trade; mine?: number | null }) {
  return (
    <div className={`${ui.row} ${ui.rowNoLead}`}>
      <div className={l.stack}>
        <Label>
          Week {trade.week}
          {trade.createdAt ? ` · ${DAY.format(new Date(trade.createdAt))}` : ''}
        </Label>
        {trade.sides.map((side) => {
          const team = teamByRoster(side.rosterId);
          const nothing = !side.gets.length && !side.picks.length && !side.faab;
          return (
            <div key={side.rosterId} className={l.stack}>
              <span className={l.lead}>
                <Avatar src={team?.avatarUrl} color={team?.colors?.primary} />
                <span className={ui.body}>
                  <span className={`${ui.title} ${side.rosterId === mine ? ui.strong : ''}`}>{side.teamName.trim()}</span>
                  <span className={ui.sub}>{managerOf(side.rosterId) || side.manager} gets</span>
                </span>
              </span>
              <span className={ui.chips}>
                {side.gets.map((p) => (
                  <button key={p.id} type="button" data-player={p.id} className={ui.chip} aria-label={`${p.name}, open player`}>
                    <span className={l.lead}>
                      <Face id={p.id} team={p.team} size={32} defense={p.position === 'DEF'} />
                      {shortName(p.name, p.position, p.team)}
                    </span>
                  </button>
                ))}
                {side.picks.map((pick) => (
                  <Tag key={pick}>{pick.replace(/^(\d{4}) round (\d+)$/, '$1 Round $2')}</Tag>
                ))}
                {side.faab > 0 ? <Tag>${side.faab} FAAB</Tag> : null}
                {nothing ? <Tag>Nothing</Tag> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
