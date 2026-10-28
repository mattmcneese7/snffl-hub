'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BOOKS, setBook } from '../../../lib/book-pref';
import { BOOK_LOGOS } from '../../../kit/bookLogos';
import { Ms } from '../icons';
import { ui } from '../ui';
import a from './account.module.css';

/** Prediction markets price a game as a chance, not a sportsbook line. */
const MARKETS = new Set(['polymarket']);

/**
 * Whose lines the app shows. Each book is a row with its own app icon; yours
 * is checked. Writes the same cookie as before, then refreshes, because every
 * page that shows a line is a server component reading it.
 */
export default function Books({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const groups = [
    { label: 'Sportsbooks', books: BOOKS.filter((b) => !MARKETS.has(b.key)) },
    { label: 'Prediction Market', books: BOOKS.filter((b) => MARKETS.has(b.key)) },
  ].filter((g) => g.books.length);
  return (
    <div className={a.groups}>
      {groups.map((g) => (
        <div key={g.label} role="radiogroup" aria-label={g.label} className={a.group}>
          <div className={ui.card}>
            <span className={ui.label}>{g.label}</span>
          </div>
          <div className={`${ui.list} ${ui.tapList}`}>
            {g.books.map((book) => {
              const on = book.key === value;
              return (
                <button
                  key={book.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${ui.row} ${a.reset}`}
                  onClick={() => {
                    if (on) return;
                    setValue(book.key);
                    setBook(book.key);
                    router.refresh();
                  }}
                >
                  {BOOK_LOGOS[book.key] ? <img src={BOOK_LOGOS[book.key]} alt="" className={`${ui.thumb} ${a.logo}`} /> : <span className={`${ui.thumb} ${a.logo}`} aria-hidden />}
                  <span className={`${ui.title} ${on ? ui.strong : ''}`}>{book.name}</span>
                  <span className={`${a.check} ${ui.labelBrand}`} aria-hidden>
                    {on ? <Ms name="check" size={20} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
