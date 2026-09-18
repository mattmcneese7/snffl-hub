// The people behind the Sleeper handles, from Matt, September 2026.
//
// Keyed by roster id, which is fixed for the life of the league, rather than
// by Sleeper username, which a manager can change on a whim. Everyone in the
// league is a man and goes by he and him; the Rag's writers are told so, since
// they otherwise hedge with "they" around handles like SexRobot69.

export type ManagerPerson = { firstName: string; pronouns: 'he/him' };

export const MANAGERS: Record<number, ManagerPerson> = {
  1: { firstName: 'Matt', pronouns: 'he/him' },
  2: { firstName: 'Jackson', pronouns: 'he/him' },
  3: { firstName: 'Bearcat', pronouns: 'he/him' },
  4: { firstName: 'John', pronouns: 'he/him' },
  5: { firstName: 'Jack', pronouns: 'he/him' },
  6: { firstName: 'Sean', pronouns: 'he/him' },
  7: { firstName: 'Aaron', pronouns: 'he/him' },
  8: { firstName: 'Andrew', pronouns: 'he/him' },
  9: { firstName: 'Taylor', pronouns: 'he/him' },
  10: { firstName: 'Adam', pronouns: 'he/him' },
  11: { firstName: 'Jeff', pronouns: 'he/him' },
  12: { firstName: 'Josef', pronouns: 'he/him' },
  13: { firstName: 'Ben', pronouns: 'he/him' },
  14: { firstName: 'Trip', pronouns: 'he/him' },
};

/** First name for a roster, or null for a roster the league has not named. */
export const firstNameOf = (rosterId: number | null | undefined): string | null =>
  rosterId != null ? (MANAGERS[rosterId]?.firstName ?? null) : null;
