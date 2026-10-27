'use client';

import { useEffect, useState } from 'react';
import { ALERTS, defaultPrefs, type AlertKey, type AlertPrefs } from '@/lib/alert-prefs';
import { readMyTeam } from '@/lib/my-team';
import a from './account.module.css';

/**
 * Push alerts for this device. The same behavior every version has had: the same /api/push calls (POST to subscribe, PATCH to read
 * and save each type, DELETE to stop), the same service worker at /sw.js,
 * and the same states. iPhone only delivers web push to an app on the home
 * screen, so in a Safari tab this says so rather than offering a switch that
 * can't work.
 *
 * Once alerts are on, every type gets its own slim switch. The ones about you
 * need a team picked, and say so when there isn't one.
 */
type State = 'loading' | 'unsupported' | 'install' | 'off' | 'working' | 'on' | 'denied' | 'error';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** The applicationServerKey as raw bytes on an explicit ArrayBuffer, as v2. */
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

const NOTE: Record<State, string> = {
  loading: 'Checking this device.',
  unsupported: 'This browser can’t receive alerts.',
  install: 'On iPhone, add Splash to your Home Screen first, then turn alerts on from there.',
  off: 'Your players scoring, your matchup turning, and a nudge when you owe a chug.',
  working: 'One moment.',
  on: 'On for this device.',
  denied: 'Notifications are blocked for this site. Allow them in your browser’s settings.',
  error: 'That didn’t work. Try again in a moment.',
};

function Switch({
  on,
  label,
  disabled = false,
  onClick,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`${a.switch} ${on ? a.switchOn : ''}`}
      onClick={onClick}
    >
      <span className={a.knob} aria-hidden />
    </button>
  );
}

export default function Alerts({ hasTeam }: { hasTeam: boolean }) {
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
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
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
      // The team rides along so the alerts about you can find you. readMyTeam
      // prefers the cookie and falls back to v2's storage key.
      const team = readMyTeam();
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), teamId: team ? String(team) : null }),
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

  const canToggle = state === 'off' || state === 'on' || state === 'error' || state === 'working';
  const note =
    state === 'on' && !hasTeam ? `${NOTE.on} Pick your team above so the ones about you find you.` : NOTE[state];

  return (
    <div className={a.alerts}>
      <div className={a.setRow}>
        <span className={a.setText}>
          <b>This Device</b>
          <span>{note}</span>
          {state === 'install' ? (
            <a href="#install" className={a.inline}>
              How to install
            </a>
          ) : null}
        </span>
        {canToggle ? (
          <Switch
            on={state === 'on'}
            label="Alerts on this device"
            disabled={state === 'working'}
            onClick={() => void (state === 'on' ? disable() : enable())}
          />
        ) : null}
      </div>

      {state === 'on' && prefs ? (
        <div className={a.types}>
          <p className={a.sub}>What You Hear About</p>
          {ALERTS.map((alert) => (
            <div key={alert.key} className={a.setRow}>
              <span className={a.setText}>
                <b>{alert.label}</b>
                <span>
                  {alert.note}
                  {alert.needsTeam && !hasTeam ? ' Needs a team.' : ''}
                </span>
              </span>
              <Switch on={prefs[alert.key]} label={alert.label} onClick={() => void toggle(alert.key)} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
