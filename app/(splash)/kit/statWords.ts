/**
 * Stat lines in words. lib/sleeper-live (and lib/matchup-live, which uses
 * it) prints a line the way a box score does: "21 CAR, 165 YD, 1 RUSH TD".
 * Splash spells it out, "21 carries, 165 yards, 1 rushing TD", so nobody has
 * to know the shorthand. Every page shows stat lines through this.
 */
const WORDS: [RegExp, string][] = [
  // The lib joins a number to its word with a no-break space, so every
  // pattern takes either kind of space.
  [/\bRUSH[\s ]TD\b/g, 'rushing TD'],
  [/\bREC[\s ]TD\b/g, 'receiving TD'],
  [/\bCAR\b/g, 'carries'],
  [/\bYD\b/g, 'yards'],
  [/\bREC\b/g, 'catches'],
  [/\bINT\b/g, 'interceptions'],
  [/\bFUM\b/g, 'fumbles'],
  [/\bFG\b/g, 'field goals'],
  [/\bXP\b/g, 'extra points'],
  [/\bLONG\b/g, 'long'],
  [/\bSACK\b/g, 'sacks'],
  [/\bPA\b/g, 'points allowed'],
];
/** One of a thing is singular: "1 carry", not "1 carries". */
const ONE: Record<string, string> = {
  carries: 'carry',
  yards: 'yard',
  catches: 'catch',
  interceptions: 'interception',
  fumbles: 'fumble',
  sacks: 'sack',
};

export function statWords(line: string | null | undefined): string {
  if (!line) return '';
  const spelled = WORDS.reduce((out, [re, word]) => out.replace(re, word), line)
    // "6/11 catches" reads as a fraction: say it, "6 catches on 11 targets".
    .replace(/(\d+)\/(\d+)([\s\u00a0])catches\b/g, '$1$3catches on $2 targets')
    // A passer's "19/28" opens his line: "19 of 28 passes".
    .replace(/^(\d+)\/(\d+),/, '$1 of $2 passes,')
    .replace(/\bon 1 targets\b/g, 'on 1 target')
    .replace(/^1 of 1 passes,/, '1 of 1 pass,');
  return spelled.replace(
    /(^|[\s,])1([\s ])(carries|yards|catches|interceptions|fumbles|sacks)\b/g,
    (_, lead: string, gap: string, word: string) => `${lead}1${gap}${ONE[word]}`,
  );
}
