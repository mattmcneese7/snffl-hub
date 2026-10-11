'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isSwamiPath, type SavedView } from '@/lib/auth';
import { browserClient } from '@/lib/supabase-browser';
import { useAccount } from '@/lib/use-account';

/**
 * Saving a Swami view, for somebody signed in.
 *
 * The Swami filters through the URL so a view can be pasted into the group
 * chat; saving one is the same idea pointed at yourself. A view is the path
 * and a label, written straight to Supabase as the person under row level
 * security, and listed here as links back to each one.
 *
 * Signed out it renders nothing. The bench is exactly what it was.
 */
export default function SwamiSaveView({ path, label }: { path: string; label: string }) {
  const account = useAccount();
  const [views, setViews] = useState<SavedView[] | null>(null);
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle');
  const userId = account.status === 'in' ? account.user.id : null;

  useEffect(() => {
    const client = browserClient();
    if (!client || !userId) return;
    client
      .from('saved_views')
      .select('id, label, path')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => setViews(error ? [] : ((data ?? []) as SavedView[])));
  }, [userId]);

  if (!userId || views == null || !isSwamiPath(path)) return null;
  const saved = views.some((v) => v.path === path);

  const save = async () => {
    const client = browserClient();
    if (!client) return;
    setState('working');
    const { data, error } = await client
      .from('saved_views')
      .insert({ user_id: userId, label, path })
      .select('id, label, path')
      .single();
    if (error || !data) {
      setState('failed');
      return;
    }
    setViews([data as SavedView, ...views]);
    setState('idle');
  };

  return (
    <div className="snffl-swami-saved">
      {saved ? (
        <span className="snffl-swami-saved-note">This view is saved.</span>
      ) : (
        <button
          type="button"
          className="snffl-btn snffl-btn-secondary"
          disabled={state === 'working'}
          onClick={save}
        >
          {state === 'working' ? 'Saving' : 'Save This View'}
        </button>
      )}
      {state === 'failed' ? (
        <span className="snffl-swami-saved-note" role="status">
          Could not save that one. Try again later.
        </span>
      ) : null}
      {views
        .filter((v) => v.path !== path)
        .slice(0, 6)
        .map((v) => (
          <Link key={v.id} className="snffl-swami-filter" href={v.path}>
            {v.label}
          </Link>
        ))}
      {views.length ? (
        <Link className="snffl-btn snffl-btn-quiet" href="/account">
          Manage
        </Link>
      ) : null}
    </div>
  );
}
