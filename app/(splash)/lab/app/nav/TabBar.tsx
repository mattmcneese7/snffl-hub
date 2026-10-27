'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Ms, type MsName } from '../icons';
import { NAV_EVENT, readNav } from './store';
import { TAB_ROOTS, tabOf, type TabKey } from './tabs';
import s from '../v4.module.css';

const TABS: { key: TabKey; label: string; icon: MsName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'scores', label: 'Scores', icon: 'football' },
  { key: 'rag', label: 'The Rag', icon: 'rag' },
  { key: 'league', label: 'League', icon: 'league' },
  { key: 'swami', label: 'Swami', icon: 'swami' },
];

/**
 * The five tabs. Each remembers where you left it; tapping the tab you are
 * already in takes you to its top page, scrolled to the top.
 */
export default function TabBar({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [last, setLast] = useState<Partial<Record<TabKey, string>>>({});

  useEffect(() => {
    const read = () => setLast(readNav().tabs);
    read();
    window.addEventListener(NAV_EVENT, read);
    return () => window.removeEventListener(NAV_EVENT, read);
  }, []);

  const current = tabOf(pathname) ?? (active as TabKey);
  return (
    <nav className={s.tabs} aria-label="Sections">
      {TABS.map((t) => {
        const on = t.key === active;
        const root = TAB_ROOTS[t.key];
        const href = on ? root : (last[t.key] ?? root);
        return (
          <Link
            key={t.key}
            href={href}
            className={`${s.tab} ${on ? s.tabOn : ''}`}
            aria-current={on ? 'page' : undefined}
            onClick={(e) => {
              if (t.key !== current) return;
              // Already here: go to this tab's top page, at the top.
              e.preventDefault();
              const atRoot = pathname.replace(/\/+$/, '') === root && !window.location.search;
              if (atRoot) window.scrollTo({ top: 0, behavior: 'smooth' });
              else router.push(root);
            }}
          >
            <Ms name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
