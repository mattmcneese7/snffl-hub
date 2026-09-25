// Which NFL team a player plays for, when nothing in the league's own data
// knows him.
//
// Defensive highlights are the case. A fantasy player file holds no
// cornerbacks, so a clip of an interception carries a name we cannot place, and
// without a team there is no D/ST to credit it to: the play ends up owned by
// nobody. ESPN's own search does know him, so one lookup turns "Jevon Holland"
// into NYG and the clip lands with whoever rosters that defense.
//
// Both lookups are cached for the life of the process. The pulls run hourly
// and see the same handful of names, so this costs a request or two per run.

const SEARCH = 'https://site.web.api.espn.com/apis/search/v2';
const TEAMS = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams';

/** ESPN's spellings mapped to the code a Sleeper team defense uses. */
const DEF_CODE: Record<string, string> = { WSH: 'WAS', JAC: 'JAX', LA: 'LAR', LVR: 'LV' };

type Json = Record<string, any>;

let codes: Map<string, string> | null = null;

/** Every NFL team's full name and nickname, pointing at its Sleeper code. */
async function teamCodes(): Promise<Map<string, string>> {
  if (codes) return codes;
  const out = new Map<string, string>();
  try {
    const res = await fetch(TEAMS);
    if (res.ok) {
      const json = (await res.json()) as Json;
      const entries: Json[] = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
      for (const entry of entries) {
        const team = entry?.team;
        const abbr = String(team?.abbreviation ?? '');
        if (!abbr) continue;
        const code = DEF_CODE[abbr] ?? abbr;
        for (const name of [team?.displayName, team?.shortDisplayName, team?.name, team?.nickname]) {
          if (name) out.set(String(name).toLowerCase(), code);
        }
      }
    }
  } catch {
    // No team list means no lookups, which is the same as not knowing.
  }
  codes = out;
  return out;
}

const cache = new Map<string, string | null>();

/**
 * The team a player is on, from ESPN's search, or null when ESPN does not
 * return an NFL player by that name. The result is a Sleeper team code.
 */
export async function nflTeamForName(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  let code: string | null = null;
  try {
    const res = await fetch(`${SEARCH}?query=${encodeURIComponent(name)}&limit=5`);
    if (res.ok) {
      const json = (await res.json()) as Json;
      const groups: Json[] = json?.results ?? [];
      const players = groups.find((group) => group?.type === 'player')?.contents ?? [];
      // description is the league, subtitle is the club. Only NFL counts: the
      // same surname turns up in college football and in other sports.
      //
      // And only an exact name. ESPN answers a name it does not have with the
      // nearest one it does, which would hand a clip to the wrong manager.
      const plain = (value: string) => value.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
      const hit = players.find(
        (player: Json) =>
          String(player?.description ?? '').toUpperCase() === 'NFL' &&
          plain(String(player?.displayName ?? '')) === plain(name)
      );
      if (hit?.subtitle) code = (await teamCodes()).get(String(hit.subtitle).toLowerCase()) ?? null;
    }
  } catch {
    // A failed lookup is a player we cannot place, same as no result.
  }
  cache.set(key, code);
  return code;
}
