import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Chrome from '@/components/Chrome';
import PageHead from '@/components/PageHead';
import TeamPicker from '@/components/TeamPicker';
import { SavedViewsList, SignInButton, SignOutButton } from '@/components/AccountPanel';
import { firstNameOf } from '@/config/managers';
import { describeUser, type SavedView } from '@/lib/auth';
import { teamByRoster, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { currentUser, googleEnabled } from '@/lib/supabase-server';

export const metadata: Metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

/**
 * Signing in, and what it is for.
 *
 * Optional, and the page says so before anything else. Picking a team on a
 * device is still how the app knows whose team it is; an account is for
 * somebody who uses more than one device and would rather not set each one up.
 *
 * The team shown here is the device's, read from the same cookie every other
 * page reads. When somebody is signed in that cookie is the account's copy,
 * kept in step by AccountSync, so the two cannot disagree on screen.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string }>;
}) {
  const [{ signin }, session, google, jar] = await Promise.all([
    searchParams,
    currentUser(),
    googleEnabled(),
    cookies(),
  ]);
  const rosterId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const team = rosterId ? teamByRoster(rosterId) : null;
  const pickerTeams = teams.map((t) => ({
    rosterId: t.rosterId,
    teamName: t.teamName,
    manager: firstNameOf(t.rosterId) ?? t.manager,
  }));

  if (!session) {
    return (
      <>
        <Chrome section="Account" />
        <main className="snffl-page">
          <PageHead title="Account" />
          <section>
            <div className="snffl-card snffl-account-card">
              {signin === 'failed' ? (
                <p className="snffl-account-flag" role="status">
                  That sign in did not finish. Nothing changed. Try again whenever you like.
                </p>
              ) : null}
              <p>
                Optional. Your team already works on this device without an account, and it
                keeps working if you never sign in.
              </p>
              <p>Signing in adds:</p>
              <ul className="snffl-account-perks">
                <li>Your team on every device you sign in on</li>
                <li>Alert settings that follow you from phone to laptop</li>
                <li>Saved Swami views</li>
              </ul>
              {google ? (
                <SignInButton />
              ) : (
                <p className="snffl-account-flag" role="status">
                  Sign in is not switched on yet. Everything else works exactly as it always has.
                </p>
              )}
            </div>
          </section>
        </main>
      </>
    );
  }

  const user = describeUser(session.user);
  // Row level security returns only this person's rows. A table that does not
  // exist yet comes back as an error, which reads as an empty list.
  const [viewsRes, accountRes] = await Promise.all([
    session.client
      .from('saved_views')
      .select('id, label, path')
      .order('created_at', { ascending: false }),
    session.client.from('accounts').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);
  const views = (viewsRes.error ? [] : (viewsRes.data ?? [])) as SavedView[];
  const linked = !accountRes.error;
  const initial = (user.name ?? user.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <>
      <Chrome section="Account" />
      <main className="snffl-page">
        <PageHead title="Account" />

        <section>
          <div className="snffl-card snffl-account-card">
            <div className="snffl-account-head">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="snffl-account-photo" />
              ) : (
                <span className="snffl-account-initial-large" aria-hidden>
                  {initial}
                </span>
              )}
              <span>
                <strong>{user.name ?? 'Signed in'}</strong>
                {user.email ? <em>{user.email}</em> : null}
              </span>
            </div>
            <SignOutButton />
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Your Team</h2>
          </div>
          <div className="snffl-card snffl-account-card">
            <p>
              {team
                ? `${team.teamName}. It follows you to every device you sign in on.`
                : 'Pick your team and it follows you to every device you sign in on.'}
            </p>
            <TeamPicker teams={pickerTeams} />
            {!linked ? (
              <p className="snffl-account-flag" role="status">
                Saved on this device for now. The account side is not set up yet.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Saved Swami Views</h2>
          </div>
          <div className="snffl-card">
            <SavedViewsList views={views} />
          </div>
        </section>
      </main>
    </>
  );
}
