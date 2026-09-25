'use client';

import { useEffect, useState } from 'react';
import { ALERTS, defaultPrefs, type AlertKey, type AlertPrefs } from '@/lib/alert-prefs';

/**
 * Turns push alerts on for this device, Brief Section 2: "Push alerts for
 * touchdowns and lead changes, toggled per device."
 *
 * iPhone only delivers web push to an app installed to the home screen, so in
 * a plain Safari tab this says so rather than offering a switch that cannot
 * work.
 *
 * Once alerts are on, every type gets its own switch. The first version sent
 * every touchdown in the league to everybody, which read as random score
 * updates, so the types that are about you are on and the loud one is not.
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
  const [prefs, setPrefs] = useState<AlertPrefs | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  /** Reads this device's saved settings, so the switches match the server. */
  const loadPrefs = async (deviceEndpoint: string) => {
    setEndpoint(deviceEndpoint);
    try {
      const res = await fetch('/api/push', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: deviceEndpoint }),
      });
      const data = (await res.json()) as { prefs?: AlertPrefs };
      setPrefs(data.prefs ?? defaultPrefs());
    } catch {
      setPrefs(defaultPrefs());
    }
  };

  /** Flips one type and saves it. The switch moves first, then the request. */
  const toggle = async (key: AlertKey) => {
    if (!prefs || !endpoint) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await fetch('/api/push', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, prefs: { [key]: next[key] } }),
      });
    } catch {
      setPrefs(prefs);
    }
  };

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
      .then((subscription) => {
        setState(subscription ? 'on' : 'off');
        if (subscription) void loadPrefs(subscription.endpoint);
      })
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
      if (res.ok) {
        const data = (await res.json()) as { prefs?: AlertPrefs };
        setEndpoint(subscription.endpoint);
        setPrefs(data.prefs ?? defaultPrefs());
      }
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
      setPrefs(null);
      setEndpoint(null);
      setState('off');
    } catch {
      setState('error');
    }
  };

  const note: Record<State, string> = {
    loading: 'Checking this device.',
    unsupported: 'This browser cannot receive alerts.',
    install: 'On iPhone, add the site to your Home Screen first, then turn alerts on there.',
    off: 'Your players scoring, your matchup turning, and a nudge when you owe a chug.',
    working: 'One moment.',
    on: 'On for this device. Pick your team above so the ones about you find you.',
    denied: 'Notifications are blocked for this site. Allow them in your browser settings.',
    error: 'That did not work. Try again in a moment.',
  };

  const canToggle = state === 'off' || state === 'on' || state === 'error';

  return (
    <>
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
    {state === 'on' && prefs ? (
      <div className="snffl-alert-prefs">
        <p className="snffl-alert-prefs-head">What you hear about</p>
        <ul className="snffl-alert-list">
          {ALERTS.map((alert) => (
            <li key={alert.key} className="snffl-alert-row">
              <span className="snffl-alert-copy">
                <span className="snffl-menu-label">{alert.label}</span>
                <span className="snffl-menu-note">{alert.note}</span>
              </span>
              <button
                type="button"
                className={`snffl-theme-choice${prefs[alert.key] ? ' snffl-theme-choice-active' : ''}`}
                aria-pressed={prefs[alert.key]}
                onClick={() => void toggle(alert.key)}
              >
                <span>{prefs[alert.key] ? 'On' : 'Off'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    </>
  );
}
