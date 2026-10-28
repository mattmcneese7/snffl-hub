/** Injury status as the box score prints it: Q, D, OUT, IR. */
const ABBR: Record<string, string> = { Questionable: 'Q', Doubtful: 'D', Out: 'OUT', Sus: 'SUS', Suspended: 'SUS', 'Injured Reserve': 'IR', IR: 'IR', PUP: 'PUP', NA: 'NA', COV: 'COV' };

export function injAbbr(status: string): string {
  return ABBR[status] ?? status.toUpperCase().slice(0, 4);
}
