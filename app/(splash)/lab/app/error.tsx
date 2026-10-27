'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Frame } from './Skeleton';
import s from './v4.module.css';
import k from './skeleton.module.css';

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
      <section className={`${s.card} ${k.notice}`} role="alert">
        <h2>This Page Didn&rsquo;t Load</h2>
        <p className={s.note}>Sleeper or ESPN took too long to answer. Scores and stats usually come back in a few seconds.</p>
        <div className={k.actions}>
          <button type="button" className={k.primary} onClick={reset}>
            Try again
          </button>
          <Link href="/lab/app" className={k.secondary}>
            Home
          </Link>
        </div>
      </section>
    </Frame>
  );
}
