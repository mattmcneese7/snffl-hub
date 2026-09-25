import type { Metadata } from 'next';
import './lab.css';

/**
 * The design lab: proposals for the dark only, app first overhaul.
 *
 * Its own route and its own stylesheet, with no site chrome, so a direction
 * can be judged on a phone without touching the live app or migrating a single
 * token. Nothing in here is wired to real data; every number is real, taken
 * from Weeks 2 and 3, so the layouts are judged at the sizes they will have.
 */
export const metadata: Metadata = {
  title: 'SNFFL design lab',
  robots: { index: false, follow: false },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className="lab">{children}</div>;
}
