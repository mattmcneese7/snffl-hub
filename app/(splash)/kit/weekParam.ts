import { notFound } from 'next/navigation';

/**
 * A week from the URL, 1 to 18, or a 404. Never a quiet fall back to week 1:
 * /scoreboard/abc is a page that doesn't exist, not week 1.
 */
export function weekParam(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 18) notFound();
  return n;
}
