import { latestChug } from '@/lib/chug-video';
import { scoredWeek, teamByRoster } from '@/lib/league';
import { trophyBoard } from '../cached';
import { latestWeekStory, type StorySlide } from '@/lib/week-story';
import FilmPlayer from './FilmPlayer';
import { managerOf } from './shared';
import s from '../v4.module.css';

/** A slow read never holds the page: past `ms` it comes back as `fallback`. */
function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((done) => setTimeout(() => done(fallback), ms))]);
}

/**
 * Film: the week in 90 seconds and the latest chug, side by side. Renders
 * nothing when the league has neither yet. Pass `week` to skip the lookup.
 * The story read is capped at eight seconds so a slow source cannot stall Home.
 */
export default async function FilmTile({ week, withChug = true }: { week?: number; withChug?: boolean }) {
  const wk = week ?? (await scoredWeek());
  const [slides, board] = await Promise.all([within(latestWeekStory(wk), 8000, [] as StorySlide[]), within(trophyBoard(), 8000, null)]);
  const intro = slides.find((x) => x.kind === 'intro');
  const storyWeek = intro && intro.kind === 'intro' ? intro.week : null;
  const cover = intro && intro.kind === 'intro' ? intro.art.still : null;
  const chug = withChug ? latestChug(wk) : null;
  if (!slides.length && !chug) return null;
  const shartAward = chug ? board?.all.find((a) => a.kind === 'shart' && a.week === chug.week) : undefined;
  const shart = shartAward ? { team: teamByRoster(shartAward.rosterId)?.teamName.trim() ?? '', manager: managerOf(shartAward.rosterId) } : null;
  return (
    <section aria-label="Film">
      <div className={s.title}>
        <h2>Film</h2>
      </div>
      <div style={{ marginTop: 8 }}>
        <FilmPlayer slides={slides} storyWeek={storyWeek} cover={cover} chug={chug} shart={shart} />
      </div>
    </section>
  );
}
