import { firstNameOf } from '@/config/managers';
import { teamByRoster } from '@/lib/league';
import { sleeperLink, type SleeperAction } from '@/lib/sleeper-links';
import home from '../../home/home.module.css';
import s from '../sb.module.css';
import { SLEEPER_MARK } from '../../kit/sleeperMark';

/**
 * Small pieces the Scoreboard, the matchup page and the NFL game page share:
 * number formats, the live drop, a manager's first name, and the pill that
 * leaves for Sleeper.
 */

export const DROP_PATH = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

export const pts = (n: number) => n.toFixed(2);

export const nameOf = (rosterId: number, fallback = '') => firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? fallback;

/** Lib copy is written with straight apostrophes; on screen they curl. */
export const curl = (text: string) => text.replace(/(\w)'(\w)/g, '$1’$2').replace(/'/g, '’');

/** "Sun 12 PM", Central, the way v2's slate prints a kickoff. */
export function kickoff(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
    .format(new Date(iso))
    .replace(':00', '');
}

/** "Q3 4:12", or "OT 2:00". */
export const quarter = (period: number | null | undefined, clock: string | null | undefined) =>
  `${period && period > 4 ? 'OT' : `Q${period ?? 1}`} ${clock ?? ''}`.trim();

export function Drop({ label }: { label?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={s.drop} aria-label={label} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined}>
      <path d={DROP_PATH} />
    </svg>
  );
}

/**
 * A pill that leaves for Sleeper, in the menu bar's material like every
 * other pill. Sleeper's own mark on it, since the tap leaves the app.
 */
export function SleeperPill({ action, label }: { action: SleeperAction; label: string }) {
  return (
    <a href={sleeperLink(action)} target="_blank" rel="noopener noreferrer" className={`${home.pillBtn} ${home.pillSmall}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SLEEPER_MARK} alt="" className={s.pillIcon} />
      {label}
      <span className={s.pillArrow} aria-hidden>
        &#8599;
      </span>
    </a>
  );
}

/** The win bar: favorite deep blue, the other side powder, rounded once so it totals 100. */
/** Away on the left, as the rows above read top first; the caption names what the bar is. */
export function WinBar({ away, caption }: { away: number; caption?: string }) {
  // Never 100 to 0 while anything is left: the model caps at 99.5, which
  // would round to a certainty it has not earned.
  const a = Math.min(99, Math.max(1, Math.round(away * 100)));
  const fav = away >= 0.5;
  return (
    <div className={s.odds}>
      <span>{a}%</span>
      <span className={s.bar} aria-hidden>
        <span className={fav ? s.barFav : s.barDog} style={{ flex: away }} />
        <span className={fav ? s.barDog : s.barFav} style={{ flex: 1 - away }} />
      </span>
      <span>{100 - a}%</span>
      {caption ? (
        <span className={s.oddsCap}>{caption}</span>
      ) : null}
    </div>
  );
}
