// Which roster is yours. Checkpoint 17.
//
// This was localStorage, read by two components that each kept their own copy
// of the key. localStorage has one fatal property for what v3 needs: the
// server cannot see it. Every personalised page therefore had to be a client
// shell that rendered nothing, then fetched, then rendered again, which is
// why there were no personalised pages.
//
// A cookie is sent with the request, so a server component knows whose roster
// it is drawing before it draws anything. Same one device, one choice, no
// account behaviour as before; it is simply readable at the point where the
// page is built.
//
// Not httpOnly on purpose: the picker is a client component and has to write
// it. There is nothing sensitive in it either way, it is a number between one
// and fourteen identifying a team in a public league.

export const TEAM_COOKIE = 'snffl_team';
/** The old home, still read once so nobody has to pick their team again. */
export const TEAM_STORAGE_KEY = 'snffl.myTeam';

/** A season is the longest this is ever useful for. */
const MAX_AGE = 60 * 60 * 24 * 200;

const valid = (n: number) => Number.isInteger(n) && n > 0 && n <= 14;

/** Parse a roster id from a cookie value, rejecting anything else. */
export function parseTeam(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return valid(n) ? n : null;
}

/**
 * Write the choice where both the browser and the server can read it, and
 * migrate the old localStorage value on the way past.
 *
 * Client only: it touches document.
 */
export function setMyTeam(rosterId: number | null) {
  if (typeof document === 'undefined') return;
  document.cookie =
    rosterId == null
      ? `${TEAM_COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${TEAM_COOKIE}=${rosterId}; path=/; max-age=${MAX_AGE}; samesite=lax`;
  try {
    if (rosterId == null) localStorage.removeItem(TEAM_STORAGE_KEY);
    else localStorage.setItem(TEAM_STORAGE_KEY, String(rosterId));
  } catch {
    // The cookie is the one that matters now. Storage refusing is survivable.
  }
}

/** Read it in the browser, preferring the cookie and falling back to storage. */
export function readMyTeam(): number | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TEAM_COOKIE}=([^;]*)`));
  const fromCookie = parseTeam(match?.[1]);
  if (fromCookie) return fromCookie;
  try {
    const saved = parseTeam(localStorage.getItem(TEAM_STORAGE_KEY));
    // Found only in the old place, so move it across and never look again.
    if (saved) setMyTeam(saved);
    return saved;
  } catch {
    return null;
  }
}
