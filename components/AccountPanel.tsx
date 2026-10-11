'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SavedView } from '@/lib/auth';
import { browserClient } from '@/lib/supabase-browser';
import { signInWithGoogle, signOut } from '@/lib/use-account';

/** Starts the Google round trip. Says so if it could not even begin. */
export function SignInButton({ next = '/account' }: { next?: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle');
  return (
    <>
      <button
        type="button"
        className="snffl-btn snffl-btn-primary"
        disabled={state === 'working'}
        onClick={async () => {
          setState('working');
          const { error } = await signInWithGoogle(next);
          // On success the browser is already on its way to Google.
          if (error) setState('failed');
        }}
      >
        {state === 'working' ? 'Opening Google' : 'Sign in with Google'}
      </button>
      {state === 'failed' ? (
        <p className="snffl-account-flag" role="status">
          Google could not be reached. Try again in a moment.
        </p>
      ) : null}
    </>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  return (
    <button
      type="button"
      className="snffl-btn snffl-btn-secondary"
      disabled={working}
      onClick={async () => {
        setWorking(true);
        await signOut();
        router.refresh();
      }}
    >
      {working ? 'Signing out' : 'Sign out'}
    </button>
  );
}

/** The person's saved Swami views, each removable. */
export function SavedViewsList({ views }: { views: SavedView[] }) {
  const [list, setList] = useState(views);
  if (!list.length) {
    return (
      <p className="snffl-view-empty">
        Nothing saved yet. Filter <Link href="/swami">the Swami</Link> and tap Save This View.
      </p>
    );
  }
  return (
    <div className="snffl-views">
      {list.map((view) => (
        <div className="snffl-view-row" key={view.id}>
          <Link href={view.path}>{view.label}</Link>
          <button
            type="button"
            className="snffl-btn snffl-btn-quiet"
            aria-label={`Remove ${view.label}`}
            onClick={async () => {
              const before = list;
              setList(list.filter((v) => v.id !== view.id));
              const client = browserClient();
              const res = await client?.from('saved_views').delete().eq('id', view.id);
              if (!res || res.error) setList(before);
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
