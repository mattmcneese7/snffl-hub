'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { BOOKS, setBook } from '../lib/book-pref';
import { BOOK_LOGOS } from '../kit/bookLogos';
import st from './settings.module.css';

/** Prediction markets price a game as a chance, not a sportsbook line. */
const MARKETS = new Set(['polymarket']);

/**
 * Pick whose lines the app shows. Each book is a tile with its own logo, the
 * sportsbooks together and the prediction markets beneath. Yours wears the
 * powder wash, a deep blue ring and a "Your book" tag, so the preference
 * reads at a glance. Writes the cookie, then refreshes, because every page
 * that shows a line is a server component reading it.
 */
export default function BookPicker({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const groups = [
    { label: 'Sportsbooks', books: BOOKS.filter((b) => !MARKETS.has(b.key)) },
    { label: 'Prediction market', books: BOOKS.filter((b) => MARKETS.has(b.key)) },
  ].filter((g) => g.books.length);

  return (
    <div className={st.bookGroups}>
      {groups.map((g) => (
        <div key={g.label} className={st.bookGroup} role="radiogroup" aria-label={g.label}>
          <span className={st.bookLabel}>{g.label}</span>
          <div className={st.bookGrid}>
            {g.books.map((book) => {
              const on = book.key === value;
              const logo = BOOK_LOGOS[book.key];
              return (
                <button
                  key={book.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`${st.bookTile} ${on ? st.bookTileOn : ''} ${g.books.length === 1 ? st.bookTileWide : ''}`}
                  onClick={() => {
                    if (on) return;
                    setValue(book.key);
                    setBook(book.key);
                    router.refresh();
                  }}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className={st.bookLogo} />
                  ) : (
                    <span className={st.bookLogo} aria-hidden />
                  )}
                  <span className={st.bookName}>{book.name}</span>
                  {on ? (
                    <span className={st.yours}>
                      <Check weight="bold" aria-hidden />
                      Your book
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
