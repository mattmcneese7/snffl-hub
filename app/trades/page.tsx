import ManagerLink from '@/components/ManagerLink';
import Link from 'next/link';
import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import { getTrades } from '@/lib/trades';

export default async function TradesPage() {
  const trades = await getTrades();

  return (
    <>
      <Chrome section="Trade Tracker" />
      <main className="snffl-page">
        <PageHead title="Trade Tracker" />
        <section>
          {trades.length === 0 ? (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">No trades yet</span>
              <span className="snffl-placeholder-note">
                Every completed trade shows up here automatically, with letter grades once the
                Trade Desk starts writing.
              </span>
            </div>
          ) : (
            <div className="snffl-trades">
              {trades.map((trade) => (
                <article className="snffl-card snffl-trade" key={trade.id}>
                  <header className="snffl-trade-head">
                    <span className="snffl-week-tag">
                      <span>WEEK {trade.week}</span>
                    </span>
                    <span className="snffl-trade-grade">Grade pending</span>
                  </header>

                  <div className="snffl-trade-sides">
                    {trade.sides.map((side) => (
                      <div className="snffl-trade-side" key={side.rosterId}>
                        <div className="snffl-trade-side-head">
                          <span
                            className="snffl-trade-side-bar"
                            style={{ background: side.primary }}
                          />
                          <span>
                            <Link className="snffl-trade-team" href={`/managers/${side.rosterId}`}>
                              {side.teamName}
                            </Link>
                            <span className="snffl-menu-note">
                              <ManagerLink rosterId={side.rosterId}>{side.manager}</ManagerLink> receives
                            </span>
                          </span>
                        </div>

                        <ul className="snffl-trade-gets">
                          {side.gets.map((player) => (
                            <li key={player.id}>
                              <Link href={`/players/${player.id}`}>{player.name}</Link>
                              <span className="snffl-menu-note">
                                {player.position}
                                {player.team ? ` · ${player.team}` : ''}
                              </span>
                            </li>
                          ))}
                          {side.picks.map((pick) => (
                            <li key={pick}>{pick}</li>
                          ))}
                          {side.faab > 0 ? <li>${side.faab} FAAB</li> : null}
                          {!side.gets.length && !side.picks.length && !side.faab ? (
                            <li className="snffl-menu-note">Nothing</li>
                          ) : null}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
