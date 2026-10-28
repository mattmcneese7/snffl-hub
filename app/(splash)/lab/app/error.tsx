'use client';

import { useEffect } from 'react';
import { Frame } from './Skeleton';
import { Pill, ui } from './ui';
import k from './ui/blocks/Skeleton.module.css';

/**
 * When a page fails: the same frame, a plain line about what happened, a way
 * to try again and a way home. Usually Sleeper or ESPN was slow to answer.
 */
export default function V4Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Frame active="" bar={false}>
      <section className={k.notice} role="alert">
        <h2>This Page Didn&rsquo;t Load</h2>
        <p className={ui.bodyText}>Sleeper or ESPN took too long to answer. Scores and stats usually come back in a few seconds.</p>
        <div className={k.actions}>
          <button type="button" className={`${ui.pill} ${ui.pillPrimary}`} onClick={reset}>
            Try again
          </button>
          <Pill href="/" kind="secondary">
            Home
          </Pill>
        </div>
      </section>
    </Frame>
  );
}
