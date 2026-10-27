import type { Metadata } from 'next';
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
import { Avatar, Card, Drawer, List, Row, Section, ui } from '../ui';
import a from './account.module.css';

export const metadata: Metadata = { title: { absolute: 'Account, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Account, from the avatar on every screen. Splash has no sign in: your team
 * is remembered on this device, and everything personal (the score bar, your
 * matchup, alerts) keys off it. Then the odds book, alerts and install.
 * Static notes sit on the page; only the pickers and links are cards.
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
      <Section title="My Team">
        {me ? (
          <List>
            <Row
              lead={<Avatar src={me.avatarUrl} color={me.colors?.primary} size={44} />}
              title={me.teamName}
              strong
              sub={`${firstNameOf(me.rosterId) ?? me.manager} · ${me.wins}-${me.losses} · Seed ${me.seed}`}
            />
          </List>
        ) : null}
        <Card>
          <p className={ui.bodyText}>Remembered on this device. No account or password.</p>
        </Card>
        {me ? (
          <Drawer title="Change Team">
            <TeamPick teams={pickable} current={mine} className={a.flush} />
          </Drawer>
        ) : (
          <TeamPick teams={pickable} current={mine} className={ui.tapList} />
        )}
      </Section>
      <Section title="Odds">
        <Card>
          <p className={ui.bodyText}>Lines come from your book. Where it has none, the DraftKings line shows, labeled.</p>
        </Card>
        <Books current={bookFrom(jar)} />
      </Section>
      <Section title="Alerts">
        <Alerts hasTeam={mine != null} />
      </Section>
      <div id="install">
        <Section title="Install on Your Phone">
          <Card>
            <p className={ui.bodyText}>
              <b className={ui.strong}>iPhone:</b> open in Safari, tap Share, then Add to Home Screen. Alerts only arrive in the installed app.
            </p>
            <p className={ui.bodyText}>
              <b className={ui.strong}>Android:</b> open the browser menu, then Install or Add to Home screen.
            </p>
          </Card>
        </Section>
      </div>
      <Section title="More">
        <List tap>
          <Row href="/lab/app/my-team" title="My Team" />
          <Row href="/lab/app/rules" title="League Rules" />
          <Row href="/lab/app/join" title="Invite Someone" />
        </List>
      </Section>
    </Shell>
  );
}
