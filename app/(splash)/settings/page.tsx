import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { ShareGlyph } from '@/components/InstallGuide';
import { firstNameOf } from '@/config/managers';
import { teamByRoster, teams } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget, { WidgetHead } from '../home/Widget';
import w from '../home/widgets.module.css';
import TeamSelect from '../my-team/TeamSelect';
import { bookFrom } from '../lib/odds-books';
import Alerts from './Alerts';
import BookPicker from './BookPicker';
import st from './settings.module.css';

export const metadata: Metadata = { title: { absolute: 'Settings, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Settings, in Splash: your team, your sportsbook, your alerts, and getting
 * the app on your phone. Everything v2's settings did, and nothing it only promised: there
 * is one look, so there is nothing to choose about it.
 *
 * Server rendered from the team cookie, so the picker opens on your team and
 * the alerts know whether the ones about you have anyone to find.
 */
export default async function SettingsPage() {
  const jar = await cookies();
  const rosterId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const team = rosterId ? teamByRoster(rosterId) : undefined;
  const book = bookFrom(jar);
  const pickable = teams.map((t) => ({ rosterId: t.rosterId, teamName: t.teamName, manager: firstNameOf(t.rosterId) ?? t.manager }));

  return (
    <Shell active="more">
      <PageHead title="Settings" />
      <div className={w.grid}>
        <Widget size="m" icon="jersey" title="My team">
          <div className={st.stack}>
            <TeamSelect teams={pickable} current={rosterId} empty="Not set" />
            <p className={st.note}>Remembered on this device. No account.</p>
            {team ? (
              <Link href="/my-team" className={st.mineLink}>
                Open My Team
                <CaretRight weight="bold" className={st.caret} aria-hidden />
              </Link>
            ) : null}
          </div>
        </Widget>

        <Widget size="m" icon="coins" title="Odds">
          <div className={st.stack}>
            <BookPicker current={book} />
            <p className={st.note}>Every line in the app comes from your book. Where it has none, the DraftKings line shows, labeled.</p>
          </div>
        </Widget>

        <Widget size="m" icon="bell" title="Alerts">
          <Alerts hasTeam={rosterId != null} />
        </Widget>

        {/* A plain widget section, so the alerts' install note can link here. */}
        <section id="install" className={`${w.widget} ${w.m}`}>
          <WidgetHead icon="phone" title="Install on your phone" />
          <div className={st.platform}>
            <span className={st.label}>iPhone</span>
            <ol className={st.steps}>
              <li>
                <span>
                  Open this site in <b>Safari</b>.
                </span>
              </li>
              <li>
                <span>
                  Tap <b>Share</b>
                  <span className={st.glyph}>
                    <ShareGlyph />
                  </span>
                  , then <b>Add to Home Screen</b>.
                </span>
              </li>
              <li>
                <span>Open Splash from the home screen icon.</span>
              </li>
              <li>
                <span>Turn alerts on here once you&rsquo;re in. iPhone only delivers them to an installed app.</span>
              </li>
            </ol>
          </div>
          <div className={st.platform}>
            <span className={st.label}>Android</span>
            <ol className={st.steps}>
              <li>
                <span>Open the browser menu.</span>
              </li>
              <li>
                <span>
                  Tap <b>Install</b>, or <b>Add to Home screen</b>.
                </span>
              </li>
              <li>
                <span>Open Splash from the home screen icon.</span>
              </li>
            </ol>
          </div>
          <Link href="/join" className={st.joinLink}>
            Invite someone
            <CaretRight weight="bold" className={st.caret} aria-hidden />
          </Link>
        </section>
      </div>
    </Shell>
  );
}
