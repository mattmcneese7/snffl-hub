'use client';

import { useEffect, useState } from 'react';

/**
 * Turns push alerts on for this device, Brief Section 2: "Push alerts for
 * touchdowns and lead changes, toggled per device."
 *
 * iPhone only delivers web push to an app installed to the home screen, so in
 * a plain Safari tab this says so rather than offering a switch that cannot
 * work.
 */
type State = 'loading' | 'unsupported' | 'install' | 'off' | 'working' | 'on' | 'denied' | 'error';

const TEAM_KEY = 'snffl.myTeam';
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/**
 * The applicationServerKey has to be raw bytes, not the base64url string.
 *
 * Built on an explicit ArrayBuffer: Uint8Array.from returns one typed over
 * ArrayBufferLike, which could be a SharedArrayBuffer and so is not a valid
 * BufferSource for subscribe().
 */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function AlertsToggle() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported || !VAPID) {
      setState(isIos() && !isInstalled() ? 'install' : 'unsupported');
      return;
    }
    if (isIos() && !isInstalled()) {
      setState('install');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? 'on' : 'off'))
      .catch(() => setState('off'));
  }, []);

  const enable = async () => {
    setState('working');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID),
      });

      let teamId: string | null = null;
      try {
        teamId = localStorage.getItem(TEAM_KEY);
      } catch {
        // Private browsing can refuse storage. Alerts still work without a team.
      }

      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), teamId }),
      });
      setState(res.ok ? 'on' : 'error');
    } catch {
      setState('error');
    }
  };

  const disable = async () => {
    setState('working');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState('off');
    } catch {
      setState('error');
    }
  };

  const note: Record<State, string> = {
    loading: 'Checking this device.',
    unsupported: 'This browser cannot receive alerts.',
    install: 'On iPhone, add the site to your Home Screen first, then turn alerts on there.',
    off: 'Touchdowns, lead changes in your game, and a nudge when you owe a chug.',
    working: 'One moment.',
    on: 'On for this device. Pick your team above so lead changes and chug reminders find you.',
    denied: 'Notifications are blocked for this site. Allow them in your browser settings.',
    error: 'That did not work. Try again in a moment.',
  };

  const canToggle = state === 'off' || state === 'on' || state === 'error';

  return (
    <div className="snffl-settings-row">
      <span>
        <span className="snffl-menu-label">Alerts</span>
        <span className="snffl-menu-note">{note[state]}</span>
      </span>
      {canToggle ? (
        <button
          type="button"
          className={`snffl-theme-choice${state === 'on' ? ' snffl-theme-choice-active' : ''}`}
          aria-pressed={state === 'on'}
          onClick={state === 'on' ? disable : enable}
        >
          <span>{state === 'on' ? 'On' : 'Off'}</span>
        </button>
      ) : null}
    </div>
  );
}
