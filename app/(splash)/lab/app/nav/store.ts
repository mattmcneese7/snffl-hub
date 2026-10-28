'use client';

import type { TabKey } from './tabs';

/**
 * The app's own memory of where you have been this session: a stack of
 * screens (path, title, scroll) for the back button, and the last screen in
 * each tab for the tab bar. Kept in sessionStorage, so it survives reloads
 * and ends with the session.
 */
export type NavEntry = { path: string; title: string; tab: TabKey | null; y: number };
type NavState = { stack: NavEntry[]; tabs: Partial<Record<TabKey, string>> };

const KEY = 'splash4.nav';
export const NAV_EVENT = 'splash:nav';

export function readNav(): NavState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as NavState;
  } catch {
    // Private windows and blocked storage fall back to an empty memory.
  }
  return { stack: [], tabs: {} };
}

export function writeNav(state: NavState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ stack: state.stack.slice(-40), tabs: state.tabs }));
  } catch {
    // Without storage, back falls back to each page's parent.
  }
  window.dispatchEvent(new Event(NAV_EVENT));
}

export const herePath = () => window.location.pathname.replace(/\/+$/, '') + window.location.search;

/** The screen before this one, if this session came from inside the app. */
export function previousEntry(): NavEntry | null {
  const { stack } = readNav();
  const here = herePath();
  if (!stack.length) return null;
  const top = stack[stack.length - 1];
  // The tracker may not have recorded this screen yet; then the top is the one before.
  if (top.path !== here) return top;
  return stack.length > 1 ? stack[stack.length - 2] : null;
}

// Page titles end ", Splash" (", Splash 4.0" in the lab); the back button wants the page name alone.
export const cleanTitle = (t: string) => t.replace(/,\s*Splash(?: 4\.0)?$/, '').trim();
