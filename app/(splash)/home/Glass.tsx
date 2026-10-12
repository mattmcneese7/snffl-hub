import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './home.module.css';

/**
 * The pill button: the menu bar's own material at button size, so every
 * pill on the page, the menu, the film and the buttons, is one object.
 */
export function PillLink({ href, children, small = false }: { href: string; children: ReactNode; small?: boolean }) {
  return (
    <Link href={href} className={`${styles.pillBtn} ${small ? styles.pillSmall : ''}`}>
      {children}
    </Link>
  );
}
