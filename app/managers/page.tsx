import Link from 'next/link';
import PageHead from '@/components/PageHead';
import Chrome from '@/components/Chrome';
import TeamAvatar from '@/components/TeamAvatar';
import { getStandings } from '@/lib/league';

export default async function ManagersPage() {
  const standings = await getStandings();

  return (
    <>
      <Chrome section="Managers" />
      <main className="snffl-page">
        <PageHead title="Managers" />
        <section>
          <div className="snffl-manager-grid">
            {standings.map((team) => (
              <Link
                className={`snffl-card snffl-manager-card mgr-${team.userId}`}
                href={`/managers/${team.rosterId}`}
                key={team.rosterId}
              >
                <span className="snffl-manager-card-bar" />
                <TeamAvatar rosterId={team.rosterId} className="snffl-manager-card-avatar" />
                <span className="snffl-manager-card-body">
                  <span className="snffl-standings-team-name">{team.teamName}</span>
                  <span className="snffl-standings-manager">{team.manager}</span>
                  <span className="snffl-manager-card-meta snffl-numeric">
                    {team.wins}-{team.losses}
                    {team.ties ? `-${team.ties}` : ''} &middot; {team.pointsFor.toFixed(1)} PF
                    &middot; seed {team.seed}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
