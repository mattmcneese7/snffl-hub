import type { TrophyBoard } from '@/lib/trophies';
import { latestChug } from '@/lib/chug-video';
import { teamByRoster } from '@/lib/league';
import { chugNow, CHUG_LABEL } from '../chug/status';
import Squirt from '../squirt/Squirt';
import { managerOf, teamOf } from './shared';
import { Avatar, List, Row, Section, Tag, ui } from '../ui';
import l from './layout.module.css';

/**
 * The chug this week, said plainly: who owes, for which week, by when, and
 * where it stands (owed, paid on film, or the two-beer penalty). Paid
 * shows the film, which opens the chug pop, unless the page plays it
 * itself (`film={false}`).
 */
export default function ChugNowCard({ board, week, title = 'The Chug', link = true, film: showFilm = true }: { board: TrophyBoard | null; week: number; title?: string; link?: boolean; film?: boolean }) {
  const award = board?.latest.find((a) => a.kind === 'shart');
  const film = latestChug(week);
  const now = chugNow(award?.week != null ? { rosterId: award.rosterId, week: award.week } : null, film?.week ?? null);
  if (!now) return null;
  const t = teamByRoster(now.rosterId);
  const tone = now.state === 'paid' ? 'good' : now.state === 'owed' ? 'warn' : 'bad';
  return (
    <Section title={title} label={`Week ${now.week} chug`} action={link ? { href: '/chug', label: 'Chug Meter' } : undefined}>
      <List>
        <Row
          lead={<Avatar src={t?.avatarUrl} color={t?.colors?.primary} size={44} />}
          title={teamOf(now.rosterId)}
          strong
          sub={`${managerOf(now.rosterId)} · lowest score, week ${now.week}`}
          trail={
            <>
              <Tag tone={tone}>{CHUG_LABEL[now.state]}</Tag>
              <span className={ui.sub}>{now.due}</span>
            </>
          }
        />
      </List>
      {now.state !== 'paid' ? (
        <div className={l.center}>
          <Squirt award="chug" size={140} label={`Squirt with the beer ${managerOf(now.rosterId)} owes`} />
        </div>
      ) : null}
      {now.state === 'paid' && film && showFilm ? (
        <div className={ui.card}>
          <button type="button" data-chug className={l.bare} aria-label={`Watch the week ${film.week} chug`}>
            <span className={ui.media}>
              <video src={`${film.src}#t=1.5`} muted playsInline preload="metadata" aria-hidden />
              <span className={ui.mediaTag}>
                <Tag>Watch the chug</Tag>
              </span>
            </span>
          </button>
        </div>
      ) : null}
    </Section>
  );
}
