// Links from the site into Sleeper. Checkpoint 12b, settled in 18e.
//
// The question we kept circling, whether a link can open the Sleeper app on the
// exact screen where an action is done, has a definitive answer now, read
// straight from Sleeper's own two config files:
//
//   iOS  (sleeper.com/.well-known/apple-app-site-association) claims only four
//        path families for the app: /topics, /channels, /topic, /message. All
//        chat. A league, team, matchup or trade link is NOT claimed, so on an
//        iPhone it opens in the browser, on the exact screen.
//
//   Android (assetlinks.json) claims handle_all_urls, so the app intercepts
//        every sleeper.com link, but it drops the user at the app's home rather
//        than routing to the screen the URL names.
//
// So "open the app, on the specific action" is not possible: the app only deep
// links to chat, and the action screens only deep link through the web. Given
// that, the web URL is the better choice, not the fallback. On an iPhone it
// lands on the exact lineup or trade screen; on Android the app grabs it to
// home, which is no worse than a scheme link would have done and needs no
// guessing about which scheme the app registered. A custom scheme was tried and
// only ever opened the app to home, which is strictly worse, so it is gone.
//
// Deliberately free of other lib imports, so client components can use it.

export const SLEEPER_LEAGUE_ID =
  process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID || '1394336593518546944';

export type SleeperAction = 'lineup' | 'matchup' | 'players' | 'trades' | 'standings' | 'scores' | 'league';

const PATHS: Record<SleeperAction, string> = {
  lineup: 'team',
  matchup: 'matchup',
  players: 'players',
  trades: 'trades',
  standings: 'standings',
  scores: 'scores',
  league: '',
};

export const ACTION_LABELS: Record<SleeperAction, string> = {
  lineup: 'Set Lineup',
  matchup: 'Matchup',
  players: 'Add or Drop',
  trades: 'Propose Trade',
  standings: 'Standings',
  scores: 'Scores',
  league: 'League',
};

/**
 * The Sleeper link for an action in this league.
 *
 * Always the web route: on an iPhone it opens the browser on the exact screen,
 * which is the most targeted a Sleeper link can be, and on Android the app
 * takes it to home, which is the ceiling there whatever the link. This is the
 * best available, not a placeholder waiting on a better one.
 */
export function sleeperLink(action: SleeperAction, leagueId = SLEEPER_LEAGUE_ID): string {
  const path = PATHS[action];
  return `https://sleeper.com/leagues/${leagueId}${path ? `/${path}` : ''}`;
}

/** Kept for callers that still ask for the web URL by name. */
export const sleeperWebUrl = sleeperLink;
