'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { cleanTitle, herePath, readNav, writeNav } from './store';
import { tabOf } from './tabs';

const HOME = '/lab/app';
const LAST = 'splash4.last';
const RESUME_MS = 12 * 3600 * 1000;

/**
 * Records every screen you open, in order, with where you were scrolled.
 * Coming back to the screen you were just on pops it and restores the
 * scroll; anything else pushes a new entry.
 *
 * It also reopens where you left off (a Step 2 decision): the last screen is
 * kept on the device, and a fresh launch from the home screen icon, which
 * always starts at Home, goes back to it if it was within 12 hours.
 */
export default function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const restoring = useRef(false);

  useEffect(() => {
    const path = herePath();
    const state = readNav();
    const { stack } = state;
    try {
      const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const last = JSON.parse(localStorage.getItem(LAST) ?? 'null') as { path: string; at: number } | null;
      if (!stack.length && path === HOME && installed && last && last.path !== HOME && Date.now() - last.at < RESUME_MS) {
        router.replace(last.path);
        return;
      }
      localStorage.setItem(LAST, JSON.stringify({ path, at: Date.now() }));
    } catch {
      // Without storage the app simply opens on Home.
    }
    const tab = tabOf(path);
    let restoreTo: number | null = null;
    if (stack.length > 1 && stack[stack.length - 2].path === path) {
      stack.pop();
      restoreTo = stack[stack.length - 1].y;
    } else if (!stack.length || stack[stack.length - 1].path !== path) {
      stack.push({ path, title: '', tab, y: 0 });
    }
    if (tab) state.tabs[tab] = path;
    writeNav(state);

    // The title arrives with the page's metadata, a beat after the path.
    const name = window.setTimeout(() => {
      const st = readNav();
      const top = st.stack[st.stack.length - 1];
      if (top && top.path === path) {
        top.title = cleanTitle(document.title);
        writeNav(st);
      }
    }, 120);

    // Put you back where you were. The page may still be streaming in, so
    // keep trying for a moment until it is tall enough.
    let tries = 0;
    let timer = 0;
    if (restoreTo != null && restoreTo > 0) {
      restoring.current = true;
      const target = restoreTo;
      const attempt = () => {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        if (room >= target - 4 || tries > 30) {
          window.scrollTo(0, Math.min(target, Math.max(0, room)));
          restoring.current = false;
          return;
        }
        tries += 1;
        timer = window.setTimeout(attempt, 60);
      };
      attempt();
    }
    return () => {
      window.clearTimeout(name);
      window.clearTimeout(timer);
    };
  }, [pathname, search, router]);

  // Remember the scroll of the screen on top, so back can return to it.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (restoring.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const st = readNav();
        const top = st.stack[st.stack.length - 1];
        if (top && top.path === herePath()) {
          top.y = Math.round(window.scrollY);
          try {
            sessionStorage.setItem('splash4.nav', JSON.stringify(st));
          } catch {
            // No storage, no scroll memory.
          }
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
