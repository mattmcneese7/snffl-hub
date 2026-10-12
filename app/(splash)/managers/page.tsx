import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { TROPHIES } from '@/components/Trophy';
import { firstNameOf } from '@/config/managers';
import { getStandings } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getTrophyBoard } from '@/lib/trophies';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget from '../home/Widget';
import AwardIcon from '../home/Awards';
import Face, { initialsOf } from './Face';
import w from '../home/widgets.module.css';
import m from './managers.module.css';

export const metadata: Metadata = { title: { absolute: 'Managers, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;

/**
 * Managers: all fourteen as squares on the wallpaper, in table order. Each
 * square carries what v2's card did (avatar, team, manager, record, points
 * for, seed) plus the hardware he holds right now, and opens his page. Your
 * team, once picked, wears the powder wash.
 */
export default async function ManagersPage() {
  const [standings, board, jar] = await Promise.all([getStandings(), getTrophyBoard().catch(() => null), cookies()]);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);

  return (
    <Shell active="more">
      <PageHead title="Managers" />
      <div className={w.grid}>
        {standings.length ? (
          standings.map((t) => {
            const name = firstNameOf(t.rosterId) ?? t.manager;
            const held = board?.holders[t.rosterId] ?? [];
            return (
              <section key={t.rosterId} className={`${w.widget} ${w.s} ${t.rosterId === mine ? m.mine : ''}`}>
                <Link
                  href={`/managers/${t.rosterId}`}
                  className={m.card}
                  aria-label={`${t.teamName.trim()}, ${name}, ${record(t)}, seed ${t.seed}`}
                >
                  <span className={m.cardTop}>
                    <Face src={t.avatarUrl} size={36} initials={initialsOf(t.teamName || t.manager)} ring />
                    {held.length ? (
                      <span className={m.hw} title={held.map((k) => `Holds ${TROPHIES[k].name}`).join(', ')}>
                        {held.slice(0, 3).map((k) => (
                          <AwardIcon key={k} kind={k} size={26} />
                        ))}
                        {held.length > 3 ? <span className={m.hwMore}>+{held.length - 3}</span> : null}
                      </span>
                    ) : null}
                  </span>
                  <span className={m.cardTeam}>{t.teamName}</span>
                  <span className={m.cardName}>{name}</span>
                  <span />
                  <span className={m.cardFoot}>
                    <span className={m.cardLine}>
                      <span className={m.rec}>{record(t)}</span>
                      <span className={m.seedLabel}>Seed {t.seed}</span>
                    </span>
                    <span className={m.pf}>Points for | {t.pointsFor.toFixed(2)}</span>
                  </span>
                </Link>
              </section>
            );
          })
        ) : (
          <Widget size="m" icon="person" title="Managers">
            <p className={w.empty}>League unavailable from Sleeper.</p>
          </Widget>
        )}
      </div>
    </Shell>
  );
}
