import LabShell from '../kit/LabShell';
import { Toaster } from '../kit/Toasts';
import { WidgetHead } from '../../home/Widget';
import { PillLink } from '../../home/Glass';
import w from '../../home/widgets.module.css';
import { buildBeats, lastCompletedWeek, ragPublished } from './data';
import StoryViewer from './StoryViewer';
import s from './story.module.css';

/**
 * The route: the lab shell underneath, and the story over it as its own full
 * screen layer. The layer sits beside the shell rather than inside it, since
 * the shell's page is its own stacking context and a story inside it would
 * sit under the menu. It brings its own kit Toaster for the same reason.
 */
export default async function StoryRoute({ week, start }: { week: number; start: number }) {
  const [beats, latest] = await Promise.all([buildBeats(week), lastCompletedWeek()]);
  const weeks = Array.from({ length: latest }, (_, i) => latest - i);

  return (
    <>
      <LabShell>
        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="play" title="The week in stories" />
          <div className={s.weeks}>
            {weeks.map((n) => (
              <PillLink key={n} href={`/lab/story/${n}`} small>
                Week {n}
              </PillLink>
            ))}
          </div>
        </section>
      </LabShell>
      <Toaster>
        <StoryViewer
          key={week}
          week={week}
          beats={beats}
          start={start}
          latest={latest}
          rag={ragPublished(week) ? `/rag/${week}` : null}
        />
      </Toaster>
    </>
  );
}
