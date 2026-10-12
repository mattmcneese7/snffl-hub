import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import Icon, { type IconName } from '../home/Icons';
import k from './links.module.css';

/** Rows that go somewhere: an icon on a powder disc, a name, a note, a caret. */
export default function LinkList({ items }: { items: { href: string; label: string; note: string; icon: IconName }[] }) {
  return (
    <ul className={k.list}>
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className={k.row}>
            <span className={k.disc}>
              <Icon name={it.icon} />
            </span>
            <span className={k.text}>
              <b>{it.label}</b>
              <span>{it.note}</span>
            </span>
            <CaretRight weight="bold" className={k.caret} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
