import Link from 'next/link';
import type { TrophyBoard } from '@/lib/trophies';
import { latestChug } from '@/lib/chug-video';
import { teamByRoster } from '@/lib/league';
import { chugNow, CHUG_LABEL } from '../chug/status';
import { managerOf, teamOf } from './shared';
import s from '../v4.module.css';
import m from './modules.module.css';

/**
 * The chug this week, said plainly: who owes, for which week, by when, and
 * where it stands (owed, paid on film, or the two-beer penalty). Paid
 * shows the film, which opens the chug pop.
 */
export default function ChugNowCard({ board, week, title = 'The Chug', link = true }: { board: TrophyBoard | null; week: number; title?: string; link?: boolean }) {
  const award = board?.latest.find((a) => a.kind === 'shart');
  const film = latestChug(week);
  const now = chugNow(award?.week != null ? { rosterId: award.rosterId, week: award.week } : null, film?.week ?? null);
  if (!now) return null;
  const t = teamByRoster(now.rosterId);
  const tone = now.state === 'paid' ? s.tagGood : now.state === 'owed' ? s.tagWarn : s.tagBad;
  return (
    <section aria-label={`Week ${now.week} chug`}>
      <div className={s.title}>
        <h2>{title}</h2>
        {link ? <Link href="/lab/app/chug">Chug Meter</Link> : null}
      </div>
      <div className={`${s.list} ${m.chugNow}`} style={{ marginTop: 8 }}>
        <div className={m.chugRow}>
          <span className={s.av} style={{ width: 44, height: 44, ['--mgr' as string]: t?.colors?.primary }}>
            {t?.avatarUrl ? <img src={t.avatarUrl} alt="" /> : null}
          </span>
          <span className={s.who}>
            <b>{teamOf(now.rosterId)}</b>
            <small>
              {managerOf(now.rosterId)} &middot; lowest score, week {now.week}
            </small>
          </span>
          <span className={m.chugState}>
            <i className={`${s.tag} ${tone}`}>{CHUG_LABEL[now.state]}</i>
            <small>{now.due}</small>
          </span>
        </div>
        {now.state === 'paid' && film ? (
          <button type="button" data-chug className={m.chugFilm} aria-label={`Watch the week ${film.week} chug`}>
            <video src={`${film.src}#t=1.5`} muted playsInline preload="metadata" aria-hidden />
            <span className={m.chugPlay}>Watch the chug</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
