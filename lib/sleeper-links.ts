// Links from the site into Sleeper, Checkpoint 12b.
//
// Sleeper has no public way to change a lineup from outside its own apps, so
// the next best thing is a button that lands a manager on the right screen.
// The screens below are real routes, read out of Sleeper's own web app
// (/leagues/:league/team, /matchup, /players, /trades, /standings, /scores).
//
// Where each link opens depends on the phone:
//   Android  sleeper.com declares every URL for the app, so these open Sleeper.
//   iPhone   the app only claims /topics, /channels, /topic and /message, so a
//            league link opens Sleeper's website in Safari, which works for a
//            manager logged in there. APP_LINKS takes over per action once a
//            link has been confirmed to open the app on a real iPhone, from
//            the test page at /sleeper-links.
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

/** The Sleeper web route for an action in this league. */
export function sleeperWebUrl(action: SleeperAction, leagueId = SLEEPER_LEAGUE_ID): string {
  const path = PATHS[action];
  return `https://sleeper.com/leagues/${leagueId}${path ? `/${path}` : ''}`;
}

/**
 * iPhone links confirmed to open the Sleeper app, per action. Empty until
 * Matt has tapped through /sleeper-links on his phone; an unconfirmed guess
 * would show iPhone users "Safari cannot open the page" instead of Sleeper.
 */
export const APP_LINKS: Partial<Record<SleeperAction, string>> = {};

/** Candidate app links for the test page, each to be confirmed by a tap. */
export function candidateAppLinks(leagueId = SLEEPER_LEAGUE_ID) {
  return [
    {
      id: 'channel',
      label: 'League chat channel',
      note: 'sleeper.com/channels is one of the four paths the iPhone app claims. If the league chat shares the league id, this opens the app inside the league.',
      href: `https://sleeper.com/channels/${leagueId}`,
    },
    { id: 'scheme-root', label: 'sleeper:// (app home)', note: 'The app URL scheme, if it has one.', href: 'sleeper://' },
    {
      id: 'scheme-team',
      label: 'sleeper:// to the team screen',
      note: 'Same scheme, pointed at the lineup route.',
      href: `sleeper://leagues/${leagueId}/team`,
    },
    {
      id: 'scheme-league',
      label: 'sleeper:// to the league',
      note: 'A shorter route shape some apps use.',
      href: `sleeper://league/${leagueId}`,
    },
    { id: 'sleeperbot-root', label: 'sleeperbot:// (app home)', note: 'The scheme named after the app bundle, com.blitzstudios.sleeperbot.', href: 'sleeperbot://' },
    {
      id: 'sleeperbot-team',
      label: 'sleeperbot:// to the team screen',
      note: 'Bundle named scheme, lineup route.',
      href: `sleeperbot://leagues/${leagueId}/team`,
    },
    {
      id: 'web-team',
      label: 'Web: the team screen',
      note: 'The fallback every button uses today. Opens Safari on iPhone.',
      href: sleeperWebUrl('lineup', leagueId),
    },
  ];
}

/** The best link for an action: a confirmed app link, else the web route. */
export function sleeperLink(action: SleeperAction): string {
  return APP_LINKS[action] ?? sleeperWebUrl(action);
}
