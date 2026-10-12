import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import styles from './home.module.css';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/** Every section opens the same way, like a paper's section head: the
 * league's drop, the name, and a rule running out to the way further in. */
export default function Head({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className={styles.head}>
      <svg viewBox="0 0 64 64" className={styles.headDrop} aria-hidden>
        <path d={DROP} />
      </svg>
      <h2 className={styles.title}>{title}</h2>
      <span className={styles.rule} aria-hidden />
      {href && more ? (
        <Link href={href} className={styles.more}>
          {more}
          <CaretRight weight="bold" className={styles.caret} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
