/**
 * ESPN's game status, said the app's way. ESPN writes "10/12 - 8:15 PM EDT"
 * before kickoff and "6:23 - 4th" during a game; the app never shows a dash.
 *
 *   before   "Sunday, 7:15 PM CT" (the league runs on Central time)
 *   during   "4th, 6:23"
 *   after    "Final", "Final in OT"
 */
const OFFSET: Record<string, number> = { EDT: 4, EST: 5, CDT: 5, CST: 6, MDT: 6, MST: 7, PDT: 7, PST: 8 };

export function gameStatus(status: string | null | undefined): string {
  const raw = (status ?? '').trim();
  if (!raw) return '';

  const pre = raw.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*([A-Z]{3})$/);
  if (pre) {
    const [, mo, d, h, mi, ap, zone] = pre;
    let hour = Number(h) % 12;
    if (ap === 'PM') hour += 12;
    const now = new Date();
    const utc = Date.UTC(now.getUTCFullYear(), Number(mo) - 1, Number(d), hour + (OFFSET[zone] ?? 4), Number(mi));
    const at = new Date(utc);
    const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Chicago' }).format(at);
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(at);
    return `${day}, ${time} CT`;
  }

  if (/^Final\/OT$/i.test(raw)) return 'Final in OT';
  const live = raw.match(/^(\d{1,2}:\d{2})\s*-\s*(1st|2nd|3rd|4th|OT)$/);
  if (live) return `${live[2]}, ${live[1]}`;
  return raw.replace(/\s+-\s+/g, ', ');
}
