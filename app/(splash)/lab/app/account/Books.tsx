'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BOOKS, setBook } from '../../../lib/book-pref';
import { BOOK_LOGOS } from '../../../kit/bookLogos';
import { Ms } from '../icons';
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
    <div className={a.bookGroups}>
      {groups.map((g) => (
        <div key={g.label} role="radiogroup" aria-label={g.label} className={a.bookGroup}>
          <p className={a.sub}>{g.label}</p>
          <div className={a.books}>
            {g.books.map((book) => {
              const on = book.key === value;
              const logo = BOOK_LOGOS[book.key];
              return (
                <button
                  key={book.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${a.book} ${on ? a.bookOn : ''}`}
                  onClick={() => {
                    if (on) return;
                    setValue(book.key);
                    setBook(book.key);
                    router.refresh();
                  }}
                >
                  {logo ? <img src={logo} alt="" className={a.bookLogo} /> : <span className={a.bookLogo} aria-hidden />}
                  <span className={a.bookName}>{book.name}</span>
                  {on ? <Ms name="check" size={18} className={a.bookCheck} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
