'use client';

// Writing to Sleeper, from the manager's own device. Checkpoint 17.
//
// Everything in this file runs in the browser and nowhere else, and that is
// the entire security design rather than an implementation detail:
//
//   the token lives in this device's storage and is never sent to our server
//   the request goes from this phone straight to sleeper.com
//   squirtnite.live is not in the path and cannot be, so a breach of this
//     project leaks nothing, because this project holds nothing
//
// The cost is real and was accepted deliberately: nothing can act while the
// app is closed. There is no fixing a lineup at five to one while somebody is
// asleep, because that would mean holding live keys to fourteen accounts on a
// server, and this league decided that trade the other way.
//
// The mutations are Sleeper's own, read from their published schema:
//
//   roster_update_starters(league_id, roster_id, starters) -> Roster
//   league_create_transaction(type, league_id, k_adds, v_adds,
//                             k_drops, v_drops)            -> LeagueTransaction
//
// Note the k_/v_ pairs on transactions. That is Absinthe's way of passing a
// map through arguments that cannot hold one: the key is a player id and the
// value is a roster id.

const ENDPOINT = 'https://sleeper.com/graphql';
const TOKEN_KEY = 'snffl.sleeper.token';

/** Whether this device is carrying a token. Never reveals it. */
export function hasToken(): boolean {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
}

/**
 * Read the token, for the one purpose of attaching it to a Sleeper request.
 *
 * Deliberately not exported. Nothing outside this module needs the value, and
 * a getter for it is the thing that would let the token escape into a log, a
 * component's props or an error report.
 */
function token(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(value: string) {
  try {
    localStorage.setItem(TOKEN_KEY, value);
  } catch {
    // A device that refuses storage cannot hold a session. The caller will
    // find hasToken() false and ask again, which is the correct behaviour.
  }
}

/** Signing out is a delete. There is no copy anywhere else to revoke. */
export function forgetToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do, and nothing held.
  }
}

export class SleeperError extends Error {
  constructor(
    message: string,
    /** True when the token is missing, expired or rejected. */
    readonly unauthorized = false
  ) {
    super(message);
    this.name = 'SleeperError';
  }
}

type GraphQLResponse<T> = { data?: T; errors?: { message?: string }[] };

/**
 * One authenticated call to Sleeper.
 *
 * Errors are deliberately not decorated with the request body. A failed
 * lineup write is worth reporting; the variables that went with it are the
 * league and roster, and the token is never in scope to leak in the first
 * place.
 */
async function call<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const auth = token();
  if (!auth) throw new SleeperError('Not signed in to Sleeper on this device.', true);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new SleeperError('Could not reach Sleeper. Check the connection and try again.');
  }

  if (res.status === 401 || res.status === 403) {
    throw new SleeperError('Sleeper rejected the session. Sign in again.', true);
  }
  if (!res.ok) throw new SleeperError(`Sleeper returned ${res.status}.`);

  const body = (await res.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    const message = body.errors[0]?.message ?? 'Sleeper refused the change.';
    // Their auth failures come back as a 200 with an error body as often as
    // they come back as a 401, so the message has to be read too.
    const unauthorized = /unauth|token|forbidden|permission/i.test(message);
    throw new SleeperError(message, unauthorized);
  }
  if (!body.data) throw new SleeperError('Sleeper returned nothing.');
  return body.data;
}

const UPDATE_STARTERS = `
  mutation UpdateStarters($league_id: Snowflake!, $roster_id: Int!, $starters: String!) {
    roster_update_starters(league_id: $league_id, roster_id: $roster_id, starters: $starters) {
      roster_id
      starters
    }
  }
`;

/**
 * Set a lineup.
 *
 * `starters` is positional and must be the full list in roster order, with an
 * empty slot as the string "0". Sending a partial list does not patch the
 * lineup, it replaces it, which is how somebody ends up fielding four players.
 * The caller builds the complete array; this does not try to be clever about
 * it, because guessing a slot order is how a lineup gets quietly mangled.
 */
export async function updateStarters(
  leagueId: string,
  rosterId: number,
  starters: string[]
): Promise<string[]> {
  const data = await call<{ roster_update_starters: { starters: string[] } }>(UPDATE_STARTERS, {
    league_id: leagueId,
    roster_id: rosterId,
    // Sleeper takes the array as a JSON encoded string, not as a list.
    starters: JSON.stringify(starters),
  });
  return data.roster_update_starters?.starters ?? starters;
}

const CREATE_TRANSACTION = `
  mutation CreateTransaction(
    $type: String!, $league_id: Snowflake!,
    $k_adds: String, $v_adds: Int, $k_drops: String, $v_drops: Int
  ) {
    league_create_transaction(
      type: $type, league_id: $league_id,
      k_adds: $k_adds, v_adds: $v_adds, k_drops: $k_drops, v_drops: $v_drops
    ) {
      transaction_id
      status
    }
  }
`;

/**
 * Add a free agent, drop a player, or both at once.
 *
 * A roster at its limit must drop in the same call. Two calls would leave a
 * window where the roster is over size and Sleeper rejects the second, which
 * reads to the manager as the app losing his player.
 */
export async function addDrop(
  leagueId: string,
  rosterId: number,
  add: string | null,
  drop: string | null
): Promise<{ transaction_id: string; status: string }> {
  const data = await call<{ league_create_transaction: { transaction_id: string; status: string } }>(
    CREATE_TRANSACTION,
    {
      type: 'free_agent',
      league_id: leagueId,
      k_adds: add ?? null,
      v_adds: add ? rosterId : null,
      k_drops: drop ?? null,
      v_drops: drop ? rosterId : null,
    }
  );
  return data.league_create_transaction;
}
