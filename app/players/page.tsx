import Link from 'next/link';
import Chrome from '@/components/Chrome';
import { teamByRoster } from '@/lib/league';
import { getRosteredPlayers } from '@/lib/players';

export default async function PlayersPage() {
  const players = await getRosteredPlayers();

  return (
    <>
      <Chrome section="Players" />
      <main className="snffl-page">
        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Players</h2>
            <span className="snffl-block-heading-link">{players.length} rostered</span>
          </div>
          <div className="snffl-card">
            {players.map((entry) => {
              const owner = entry.ownerRosterId ? teamByRoster(entry.ownerRosterId) : null;
              return (
                <Link
                  className="snffl-roster-row"
                  href={`/players/${entry.player.id}`}
                  key={entry.player.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="snffl-lineup-headshot"
                    src={entry.player.headshot}
                    alt=""
                    loading="lazy"
                  />
                  <span>
                    <span className="snffl-lineup-name">{entry.player.name}</span>
                    <span className="snffl-lineup-meta">
                      {entry.player.position}
                      {entry.player.team ? ` · ${entry.player.team}` : ''}
                      {owner ? ` · ${owner.manager}` : ' · free agent'}
                    </span>
                  </span>
                  <span className="snffl-roster-points snffl-numeric">
                    {entry.totalPoints.toFixed(2)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
