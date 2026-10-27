import Link from 'next/link';
import { Frame } from './Skeleton';
import s from './v4.module.css';
import k from './skeleton.module.css';

/** A page that doesn't exist: an unpublished Rag week, a bad player id, a week past the season. */
export default function V4NotFound() {
  return (
    <Frame active="" bar={false}>
      <section className={`${s.card} ${k.notice}`}>
        <h2>Nothing Here</h2>
        <p className={s.note}>That page doesn&rsquo;t exist, or it isn&rsquo;t out yet. The Rag publishes Tuesdays.</p>
        <div className={k.actions}>
          <Link href="/lab/app" className={k.primary}>
            Home
          </Link>
          <Link href="/lab/app/scores" className={k.secondary}>
            Scores
          </Link>
          <Link href="/lab/app/league" className={k.secondary}>
            League
          </Link>
        </div>
      </section>
    </Frame>
  );
}
