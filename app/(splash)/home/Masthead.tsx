import Link from 'next/link';
import m from './masthead.module.css';

/**
 * The Rag's nameplate, at the head of its hero widget. Five directions on the
 * bench, all dated from the issue itself (its week and the day it went out):
 *
 *   tabloid    an ink band, a lime THE tag, RAG knocked out huge: a gossip
 *              sheet, which is what the Rag is
 *   broadsheet the name centered between a double rule and a single one,
 *              with the dateline under it like a paper of record
 *   blackletter a paper of record's nameplate, worn by a gossip sheet: the
 *              name in blackletter between two ears, a double rule, a dateline
 *   redtop     a British red top in Pool: a deep blue slab, the name in heavy
 *              italic, a lime starburst flash with the week in it
 *   period     a modern media logotype: the name in heavy type, the brand's
 *              drop as its full stop, the highlighter under Rag
 */

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

export type MastStyle = 'tabloid' | 'broadsheet' | 'blackletter' | 'redtop' | 'period';

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });

export default function Masthead({
  style,
  week,
  publishedAt,
  stories,
}: {
  style: MastStyle;
  week: number;
  publishedAt: string | null;
  stories: number;
}) {
  const day = publishedAt ? DAY.format(new Date(publishedAt)) : null;
  if (style === 'blackletter') {
    return (
      <Link href={`/rag/${week}`} className={m.bl} aria-label={`The Rag, week ${week}`}>
        <span className={m.blTop}>
          <span className={m.ear}>
            <b>Week {week}</b>
            {stories ? <span>{stories} stories</span> : null}
          </span>
          <span className={m.blName} aria-hidden>
            The Rag
          </span>
          <span className={`${m.ear} ${m.earRight}`}>
            <b>Tuesday edition</b>
            <span>Squirtnite FFL</span>
          </span>
        </span>
        <span className={m.double} aria-hidden />
        <span className={m.blDate}>{day ?? `Week ${week}`}</span>
      </Link>
    );
  }
  if (style === 'redtop') {
    return (
      <Link href={`/rag/${week}`} className={m.redtop} aria-label={`The Rag, week ${week}`}>
        <span className={m.slab}>
          <span className={m.rtName} aria-hidden>
            The Rag
          </span>
          <span className={m.flash} aria-hidden>
            <span>Week</span>
            <b>{week}</b>
          </span>
        </span>
        <span className={m.rtDate}>
          {day ? <span>{day}</span> : null}
          {stories ? <span>{stories} stories</span> : null}
        </span>
      </Link>
    );
  }
  if (style === 'period') {
    return (
      <Link href={`/rag/${week}`} className={m.period} aria-label={`The Rag, week ${week}`}>
        <span className={m.pName} aria-hidden>
          The <span className={m.pRag}>Rag</span>
          <svg viewBox="0 0 64 64" className={m.pDrop}>
            <path d={DROP} />
          </svg>
        </span>
        <span className={m.pDate}>
          <span>Week {week}</span>
          {day ? <span>{day}</span> : null}
          {stories ? <span>{stories} stories</span> : null}
        </span>
      </Link>
    );
  }
  if (style === 'tabloid') {
    return (
      <Link href={`/rag/${week}`} className={m.tabloid} aria-label={`The Rag, week ${week}`}>
        <span className={m.nameplate} aria-hidden>
          <span className={m.the}>The</span>
          <span className={m.rag}>Rag</span>
        </span>
        <span className={m.tabloidDate}>
          <b>Week {week}</b>
          {day ? <span>{day}</span> : null}
          {stories ? <span>{stories} stories</span> : null}
        </span>
      </Link>
    );
  }
  return (
    <Link href={`/rag/${week}`} className={m.broadsheet} aria-label={`The Rag, week ${week}`}>
      <span className={m.double} aria-hidden />
      <span className={m.bsName} aria-hidden>
        The Rag
      </span>
      <span className={m.single} aria-hidden />
      <span className={m.bsDate}>
        <span>Week {week}</span>
        {day ? <span>{day}</span> : null}
        {stories ? <span>{stories} stories</span> : null}
      </span>
    </Link>
  );
}
