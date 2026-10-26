import type { ReactNode } from 'react';
import LabShell from '../kit/LabShell';

/**
 * Gameday Live keeps one shell across the board and every gamecast, so the
 * menu and ticker stay put and only the page changes, and the loading state
 * shows inside it the instant a card is tapped.
 */
export default function LiveLayout({ children }: { children: ReactNode }) {
  return <LabShell active="scoreboard">{children}</LabShell>;
}
