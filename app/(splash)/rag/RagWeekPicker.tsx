'use client';

import WeekPicker from '../kit/WeekPicker';

/**
 * The kit's week picker, pointed at the Rag. The picker takes its links as a
 * function, and a server page cannot hand a function to a client component,
 * so the function is written here, on the client side of the line.
 */
export default function RagWeekPicker({ week }: { week: number }) {
  return <WeekPicker week={week} href={(n) => `/rag/${n}`} />;
}
