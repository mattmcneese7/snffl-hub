// Where the home screen instructions live, and which page they have to run on.
//
// iOS saves whatever URL is on screen when you tap Add to Home Screen. It does
// not read start_url out of the manifest the way Android does, so somebody
// installing from the invite got an icon that opened the invite, every time,
// forever. The page that teaches the gesture cannot be the page the gesture
// captures.
//
// So the invite hands off: it asks for the guide, sends the browser to the
// app's front door, and the instructions come up there, over the real app, on
// the URL that should end up on the home screen.

/** Set on the way out of the invite, read on the way into the app. */
export const GUIDE_KEY = 'snffl.install.guide';

/** Anything raising the instructions somewhere other than through a reload. */
export const GUIDE_EVENT = 'snffl:install-guide';

export function guideRequested(): boolean {
  try {
    return sessionStorage.getItem(GUIDE_KEY) === '1';
  } catch {
    // Private browsing refuses storage. Losing the handoff means the app opens
    // normally, which is a fine thing to fall back to.
    return false;
  }
}

export function requestGuide() {
  try {
    sessionStorage.setItem(GUIDE_KEY, '1');
  } catch {
    // Nothing to do. The app still opens; they just arrive without the arrow.
  }
}

export function clearGuide() {
  try {
    sessionStorage.removeItem(GUIDE_KEY);
  } catch {
    // Already gone as far as anything here is concerned.
  }
}
