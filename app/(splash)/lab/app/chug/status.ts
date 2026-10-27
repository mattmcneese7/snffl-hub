/**
 * Where the week's chug stands, from the league's rules: the lowest scorer
 * chugs by the first noon kickoff on Sunday; miss it and it is two beers by
 * 11:59 PM; still nothing by Monday 11:59 PM and the game is forfeited. The
 * Shart award changes hands on Tuesday, so the day of the week is enough.
 */
export type ChugState = 'owed' | 'paid' | 'penalty' | 'overdue';

export type ChugNow = { rosterId: number; week: number; state: ChugState; due: string };

export function chugNow(shart: { rosterId: number; week: number } | null, filmWeek: number | null, now = new Date()): ChugNow | null {
  if (!shart) return null;
  if (filmWeek === shart.week) return { ...shart, state: 'paid', due: 'On film' };
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const day = ct.getDay();
  const minutes = ct.getHours() * 60 + ct.getMinutes();
  if (day === 0 && minutes < 12 * 60) return { ...shart, state: 'owed', due: 'Due today, 12:00 PM' };
  if (day === 0) return { ...shart, state: 'penalty', due: 'Two beers, due tonight 11:59 PM' };
  if (day === 1) return { ...shart, state: 'overdue', due: 'Forfeits tonight, 11:59 PM' };
  return { ...shart, state: 'owed', due: 'Due Sunday, 12:00 PM' };
}

export const CHUG_LABEL: Record<ChugState, string> = {
  owed: 'Owes a chug',
  paid: 'Paid',
  penalty: 'Two-beer penalty',
  overdue: 'Two beers overdue',
};
