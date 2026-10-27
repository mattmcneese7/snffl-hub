import Link from 'next/link';
import type { TrophyBoard } from '@/lib/trophies';
import { latestChug } from '@/lib/chug-video';
import { teamByRoster } from '@/lib/league';
import { chugNow, CHUG_LABEL } from '../chug/status';
import type { Moment } from '../schedule';
import Squirt from '../squirt/Squirt';
import ChugSeenGate from './ChugSeenGate';
import { managerOf, teamOf } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

/**
 * Home's chug: one row that says who owes, for which week, by when. Owed, it
 * shows Squirt with the stein; paid, a Watch pill that opens the chug pop,
 * and the row leaves Home once this phone has watched it. Each moment shows
 * it only while it matters.
 */
export default function ChugRow({ board, week, moment }: { board: TrophyBoard | null; week: number; moment: Moment }) {
  const award = board?.latest.find((a) => a.kind === 'shart');
  const film = latestChug(week);
  const now = chugNow(award?.week != null ? { rosterId: award.rosterId, week: award.week } : null, film?.week ?? null);
  if (!now) return null;
  if (moment === 'live') return null;
  if (moment === 'midweek' && now.state === 'paid') return null;
  if (moment === 'gameday' && now.state !== 'owed') return null;
  const t = teamByRoster(now.rosterId);
  const tone = now.state === 'paid' ? s.tagGood : now.state === 'owed' ? s.tagWarn : s.tagBad;
  const row = (
    <section aria-label={`Week ${now.week} chug`}>
      <div className={s.title}>
        <h2>The Chug</h2>
        <Link href="/lab/app/chug">Chug Meter</Link>
      </div>
      <div className={`${s.list} ${m.chugLine}`} style={{ marginTop: 8 }}>
        {now.state === 'paid' ? (
          <span className={s.av} style={{ width: 44, height: 44, ['--mgr' as string]: t?.colors?.primary }}>
            {t?.avatarUrl ? <img src={t.avatarUrl} alt="" /> : null}
          </span>
        ) : (
          <Squirt award="chug" size={72} label={`Squirt with the beer ${managerOf(now.rosterId)} owes`} />
        )}
        <span className={s.who}>
          <b>{teamOf(now.rosterId)}</b>
          <small>
            {managerOf(now.rosterId)} &middot; Week {now.week} Shart
          </small>
        </span>
        {now.state === 'paid' ? (
          <button type="button" data-chug className={m.watchPill}>
            Watch
          </button>
        ) : (
          <span className={m.chugState}>
            <i className={`${s.tag} ${tone}`}>{CHUG_LABEL[now.state]}</i>
            <small>{now.due}</small>
          </span>
        )}
      </div>
    </section>
  );
  return now.state === 'paid' ? <ChugSeenGate week={now.week}>{row}</ChugSeenGate> : row;
}
