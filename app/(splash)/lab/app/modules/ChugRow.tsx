import type { TrophyBoard } from '@/lib/trophies';
import { latestChug } from '@/lib/chug-video';
import { teamByRoster } from '@/lib/league';
import { chugNow, CHUG_LABEL } from '../chug/status';
import type { Moment } from '../schedule';
import { Avatar, List, Row, Section, Tag, ui } from '../ui';
import Squirt from '../squirt/Squirt';
import ChugSeenGate from './ChugSeenGate';
import { managerOf, teamOf } from './shared';

/**
 * Home's chug: one row that says who owes, for which week, by when. Owed, it
 * shows Squirt with the stein; paid, the whole row opens the chug pop (its
 * Watch pill says so), and the row leaves Home once this phone has watched it. Each moment shows
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
  const tone = now.state === 'owed' ? 'warn' : 'bad';
  const row = (
    <Section title="The Chug" action={{ href: '/chug', label: 'Chug Meter' }} label={`Week ${now.week} chug`}>
      <List tap>
        <Row
          href="/chug"
          data={now.state === 'paid' ? { chug: '' } : undefined}
          lead={now.state === 'paid' ? <Avatar src={t?.avatarUrl} color={t?.colors?.primary} size={44} /> : <Squirt award="chug" size={72} label={`Squirt with the beer ${managerOf(now.rosterId)} owes`} />}
          title={teamOf(now.rosterId)}
          strong
          sub={`${managerOf(now.rosterId)} · Week ${now.week} Shart`}
          trail={
            now.state === 'paid' ? (
              <span className={`${ui.pill} ${ui.pillPrimary}`}>Watch</span>
            ) : (
              <>
                <Tag tone={tone}>{CHUG_LABEL[now.state]}</Tag>
                <span className={ui.valueSub}>{now.due}</span>
              </>
            )
          }
        />
      </List>
    </Section>
  );
  return now.state === 'paid' ? <ChugSeenGate week={now.week}>{row}</ChugSeenGate> : row;
}
