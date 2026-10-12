import { swamiLine, type SwamiRead } from '@/lib/swami';
import Link from 'next/link';
import { CaretDown } from '@phosphor-icons/react/dist/ssr';
import Icon from '../../home/Icons';
import { nflTeamName } from '../../kit/nflTeams';
import w from '../../home/widgets.module.css';
import s from '../sb.module.css';

/**
 * The Swami's read on one game, v2's panel as a widget: the read in one
 * sentence, the gap the trailing side has to find and who could find it,
 * the three starters still deciding it with their leverage as bars (the bar
 * is the number, against the most anybody in this game has), and the
 * matchups worth naming, soft or hard. Nothing at all once the game is
 * settled or there is nothing true to say, as in v2. Folded shut until
 * asked: the widget's head is the toggle, a native disclosure, no script.
 */
export default function SwamiPanel({ read }: { read: SwamiRead }) {
  const line = swamiLine(read);
  if (read.settled || !line) return null;
  const max = Math.max(...read.swing.map((x) => x.leverage), 1);
  return (
    <details className={`${w.widget} ${w.m} ${s.swamiFold}`}>
      <summary className={`${w.head} ${s.swamiHead}`}>
        <Icon name="genie" className={w.headIcon} />
        <span className={w.title}>The Swami</span>
        <CaretDown weight="bold" className={`${s.caret} ${s.swamiCaret}`} aria-hidden />
      </summary>
      <div className={s.swami}>
        <p className={s.read}>{line}</p>

        {read.path ? (
          <div className={s.block}>
            <span className={s.label}>The gap</span>
            <p className={s.blockText}>
              {read.path.need} to find, {read.path.upside} available from {read.path.players.length}{' '}
              {read.path.players.length === 1 ? 'man' : 'men'} still playing.
            </p>
          </div>
        ) : null}

        {read.swing.length ? (
          <div className={s.block}>
            <span className={s.label}>Still deciding it</span>
            {read.swing.map((x) => (
              <div key={x.player.id} className={s.lev}>
                <span className={s.levWho}>
                  <b>{x.player.name}</b>
                  <span className={s.sub}>{x.manager}</span>
                </span>
                <span className={s.levTrack} aria-hidden>
                  <span style={{ width: `${Math.round((x.leverage / max) * 100)}%` }} />
                </span>
                <span className={s.levNum}>{x.leverage.toFixed(1)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {read.edges.length ? (
          <div className={s.block}>
            <span className={s.label}>Matchups</span>
            <div className={s.edges}>
              {read.edges.map((e) => (
                <span key={e.player.id} className={`${s.chip} ${e.matchup!.label === 'hard' ? s.chipHot : ''}`}>
                  {e.player.name} | {e.matchup!.label} vs {nflTeamName(e.matchup!.opponent)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {read.confidence === 'thin' && read.edges.length ? (
          <p className={s.caveat}>Matchups | 2 games of defensive data, a nudge, not a verdict</p>
        ) : null}
        <Link href="/swami" className={s.textLink}>
          Swami research &rsaquo;
        </Link>
      </div>
    </details>
  );
}
