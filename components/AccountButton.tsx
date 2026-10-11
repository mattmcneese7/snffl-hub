'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { UserCircle } from '@phosphor-icons/react';
import { signOut, useAccount } from '@/lib/use-account';

/**
 * The account control. Optional, so it stays small.
 *
 * Signed out it is a quiet outline of a person that leads to the sign in
 * screen. Signed in it is the person's Google picture, or his initial, and
 * opens a short menu: who he is, the account screen, sign out.
 *
 * Rendered twice, once in the desktop bar and once beside each page's title on
 * a phone, and CSS shows whichever fits. The phone has no header bar to put
 * it in: the top of the screen is the tickers and the bottom is the dock.
 */
export default function AccountButton({ placement }: { placement: 'bar' | 'page' }) {
  const account = useAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  // Closes on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const kind = `snffl-account snffl-account-${placement}`;

  // Not configured, or not read yet: nothing, rather than a control that
  // changes shape a moment after the page appears.
  if (account.status === 'off' || account.status === 'loading') return null;

  if (account.status !== 'in') {
    return (
      <span className={kind}>
        <Link href="/account" className="snffl-account-button" aria-label="Account, sign in">
          <UserCircle weight="duotone" className="snffl-account-icon" />
        </Link>
      </span>
    );
  }

  const { user } = account;
  const initial = (user.name ?? user.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <span className={kind} ref={box}>
      <button
        type="button"
        className="snffl-account-button snffl-account-button-in"
        aria-label={`Account, signed in as ${user.name ?? user.email ?? 'you'}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {user.avatar ? (
          // Google's own picture. No referrer, so Google is not told which
          // page of this site it was shown on.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="snffl-account-photo" />
        ) : (
          <span className="snffl-account-initial" aria-hidden>
            {initial}
          </span>
        )}
      </button>
      {open ? (
        <span className="snffl-account-menu" role="menu">
          <span className="snffl-account-who">
            <strong>{user.name ?? 'Signed in'}</strong>
            {user.email ? <em>{user.email}</em> : null}
          </span>
          <Link href="/account" role="menuitem" className="snffl-account-item" onClick={() => setOpen(false)}>
            Account and saved views
          </Link>
          <button
            type="button"
            role="menuitem"
            className="snffl-account-item"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.refresh();
            }}
          >
            Sign out
          </button>
        </span>
      ) : null}
    </span>
  );
}
