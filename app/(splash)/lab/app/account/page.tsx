import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { getStandings, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { bookFrom } from '../../../lib/odds-books';
import Alerts from './Alerts';
import Books from './Books';
import TeamPick from './TeamPick';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'Account, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Account, from the avatar on every screen. Splash has no sign in: your team
 * is remembered on this device, and everything personal (the score bar, your
 * matchup, alerts) keys off it. Then the odds book, alerts and install.
 */
export default async function V4Account() {
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const [data, standings] = await Promise.all([getV4Data(mine), getStandings().catch(() => [])]);
  const me = standings.find((t) => t.rosterId === mine);
  const pickable = teams.map((t) => ({ rosterId: t.rosterId, teamName: t.teamName, manager: firstNameOf(t.rosterId) ?? t.manager, avatar: t.avatarUrl ?? null, color: t.colors?.primary ?? null }));
  return (
    <Shell data={data} active="">
      <SectionHead icon="account" word="account" week={data.week} mine={data.myRoster} back={{ href: '/lab/app', label: 'Home' }} />
      {me ? (
        <section className={s.card} aria-label="Your team">
          <div className={s.row} style={{ gridTemplateColumns: 'auto minmax(0, 1fr) auto' }}>
            <span className={s.av} style={{ width: 44, height: 44, ['--mgr' as string]: me.colors?.primary }}>
              {me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : null}
            </span>
            <span className={s.who}>
              <b style={{ fontSize: 18, fontWeight: 800 }}>{me.teamName}</b>
              <small>
                {firstNameOf(me.rosterId) ?? me.manager} &middot; {me.wins}-{me.losses} &middot; Seed {me.seed}
              </small>
            </span>
          </div>
        </section>
      ) : null}
      <section className={s.card}>
        <h3>My Team</h3>
        <p className={s.note}>Remembered on this device. No account or password.</p>
        <TeamPick teams={pickable} current={mine} />
      </section>
      <section className={s.card}>
        <h3>Odds</h3>
        <p className={s.note}>Lines come from your book. Where it has none, the DraftKings line shows, labeled.</p>
        <Books current={bookFrom(jar)} />
      </section>
      <section className={s.card}>
        <h3>Alerts</h3>
        <Alerts hasTeam={mine != null} />
      </section>
      <section className={s.card} id="install">
        <h3>Install on Your Phone</h3>
        <p className={s.note}>
          <b>iPhone:</b> open in Safari, tap Share, then Add to Home Screen. Alerts only arrive in the installed app.
        </p>
        <p className={s.note}>
          <b>Android:</b> open the browser menu, then Install or Add to Home screen.
        </p>
      </section>
      <section className={s.card}>
        <h3>More</h3>
        <div className={s.chips}>
          <Link href="/lab/app/my-team" className={s.chipA}>My Team</Link>
          <Link href="/lab/app/rules" className={s.chipA}>League rules</Link>
          <Link href="/lab/app/join" className={s.chipA}>Invite someone</Link>
        </div>
      </section>
    </Shell>
  );
}
