'use client';

import { useEffect, useState } from 'react';
import { forgetToken, hasToken, saveToken } from '@/lib/sleeper-write';

/**
 * Connecting this device to Sleeper.
 *
 * Deliberately a token box rather than a password box, and deliberately for
 * now rather than forever. Sleeper publishes no password login: their GraphQL
 * schema has passkeys, which are bound to their origin and unusable from ours,
 * and nothing else. So the sign in that thirteen managers will eventually use
 * is still being worked out, and until it is, pasting a token is the only way
 * to prove the writes themselves work. Proving the risky half before building
 * a login form for the whole league is the right order to do this in.
 *
 * Whatever replaces this, one thing does not change: the value is written to
 * this device and never sent to our server. There is no request that could
 * carry it there, because every Sleeper call in this app is made by the
 * browser.
 */
export default function SleeperConnect({ onDone }: { onDone?: () => void }) {
  const [connected, setConnected] = useState(false);
  const [value, setValue] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConnected(hasToken());
    setReady(true);
  }, []);

  // Nothing renders until the device has been read, or the wrong state flashes.
  if (!ready) return null;

  if (connected) {
    return (
      <div className="snffl-connect">
        <p className="snffl-connect-note">
          This device is connected to Sleeper. Changes you make here are sent from this
          phone straight to Sleeper.
        </p>
        <button
          type="button"
          className="snffl-connect-off"
          onClick={() => {
            forgetToken();
            setConnected(false);
            onDone?.();
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="snffl-connect">
      <p className="snffl-connect-note">
        Setting your lineup from here is not ready yet. Signing in will be an email
        and a password, once, and whatever it stores will stay on this phone.
      </p>
      {/* The hatch, not the feature.
          Sleeper issues no API keys: there is no page where a manager generates
          one, and the only thing that exists is the session token their own web
          app receives at login. Reading that out needs developer tools, which
          phones do not have, so this can never be how the league connects. It
          is here so the write path can be tested with one real session before a
          sign in screen is built for fourteen people. */}
      <details className="snffl-connect-dev">
        <summary>Testing, on a desktop</summary>
        <input
          className="snffl-connect-input"
          type="password"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Session token from sleeper.com"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button
          type="button"
          className="snffl-invite-go"
          disabled={!value.trim()}
          onClick={() => {
            saveToken(value.trim());
            setValue('');
            setConnected(true);
            onDone?.();
          }}
        >
          Connect
        </button>
      </details>
    </div>
  );
}
