import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrades, type Trade } from '@/lib/trades';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget, { WidgetHead } from '../home/Widget';
import Icon from '../home/Icons';
import Squirt from '../home/Squirt';
import w from '../home/widgets.module.css';
import t from './trades.module.css';

export const metadata: Metadata = { title: { absolute: 'Trades, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** "Oct 3", in Central time, the league's clock. */
const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

/**
 * Every trade this season, newest first, from Sleeper's transactions: the
 * week, who was in it, and what each side came away with, players by face.
 * v2 printed "Grade pending" on every trade because nothing grades them, so
 * there is no grade here at all until something real does.
 */
export default async function TradesPage() {
  const [trades, jar] = await Promise.all([getTrades().catch(() => [] as Trade[]), cookies()]);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const nameOf = (rosterId: number, fallback: string) => firstNameOf(rosterId) ?? fallback;

  return (
    <Shell active="more">
      <PageHead title="Trades" />
      <div className={w.grid}>
        {trades.length ? (
          trades.map((trade) => {
            return (
              <section key={trade.id} className={`${w.widget} ${w.l}`}>
                <WidgetHead
                  icon="swap"
                  title={`Week ${trade.week}`}
                  aside={trade.createdAt ? <span className={w.sub}>{DAY.format(new Date(trade.createdAt))}</span> : undefined}
                />
                <div className={t.sides}>
                  {trade.sides.map((side, i) => {
                    const team = teamByRoster(side.rosterId);
                    const nothing = !side.gets.length && !side.picks.length && !side.faab;
                    return (
                      <div key={side.rosterId} className={t.sideWrap}>
                        {i > 0 ? (
                          <span className={t.swap} aria-hidden>
                            <Icon name="swap" className={t.swapIcon} />
                          </span>
                        ) : null}
                        <div className={`${t.side} ${side.rosterId === mine ? t.mine : ''}`}>
                          <Link href={`/managers/${side.rosterId}`} className={t.sideHead}>
                            <span className={t.face}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {team?.avatarUrl ? <img src={team.avatarUrl} alt="" loading="lazy" /> : null}
                            </span>
                            <span className={t.sideText}>
                              <span className={t.teamName}>{side.teamName}</span>
                              <span className={w.sub}>{nameOf(side.rosterId, side.manager)} gets</span>
                            </span>
                          </Link>
                          <ul className={t.gets}>
                            {side.gets.map((p) => (
                              <li key={p.id}>
                                <Link href={`/players/${p.id}`} className={t.player}>
                                  <span className={t.headshot}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.headshot} alt="" loading="lazy" />
                                  </span>
                                  <span className={t.pText}>
                                    <span className={t.pName}>{p.name}</span>
                                    <span className={w.sub}>
                                      {[p.position, p.team].filter(Boolean).join(', ') || 'Player'}
                                    </span>
                                  </span>
                                </Link>
                              </li>
                            ))}
                            {side.picks.map((pick) => (
                              <li key={pick} className={t.extra}>
                                <span className={t.extraMark}>Pick</span>
                                <span>{pick.replace(/^(\d{4}) round (\d+)$/, '$1, round $2')}</span>
                              </li>
                            ))}
                            {side.faab > 0 ? (
                              <li className={t.extra}>
                                <span className={t.extraMark}>FAAB</span>
                                <span className={t.money}>${side.faab}</span>
                              </li>
                            ) : null}
                            {nothing ? <li className={t.nothing}>Nothing</li> : null}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <Widget size="m" className={t.emptyCard}>
            <Squirt mood="sleep" size={44} />
            <p className={w.empty}>No trades yet</p>
          </Widget>
        )}
      </div>
    </Shell>
  );
}
