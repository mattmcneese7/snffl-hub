import { Frame } from './Skeleton';
import { Pill, ui } from './ui';
import k from './ui/blocks/Skeleton.module.css';

/** A page that doesn't exist: an unpublished Rag week, a bad player id, a week past the season. */
export default function V4NotFound() {
  return (
    <Frame active="" bar={false}>
      <section className={k.notice}>
        <h2>Nothing Here</h2>
        <p className={ui.bodyText}>That page doesn&rsquo;t exist, or it isn&rsquo;t out yet. The Rag publishes Tuesdays.</p>
        <div className={k.actions}>
          <Pill href="/">Home</Pill>
          <Pill href="/scores" kind="secondary">
            Scores
          </Pill>
          <Pill href="/league" kind="secondary">
            League
          </Pill>
        </div>
      </section>
    </Frame>
  );
}
