'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DotsThree, ShareNetwork } from '@phosphor-icons/react';
import Rolling from '../kit/Rolling';
import Segmented from '../kit/Segmented';
import Sheet from '../kit/Sheet';
import Press from '../kit/Press';
import Reveal from '../kit/Reveal';
import { useToast } from '../kit/Toasts';
import { haptic } from '../kit/haptics';
import Icon, { type IconName } from '../../home/Icons';
import w from '../../home/widgets.module.css';
import pill from '../../home/home.module.css';
import m from './modules.module.css';

type Top = { id: string; name: string; position: string; team: string | null; headshot: string | null; points: number; slot: string; owner: string | null };
type Row = { rosterId: number; seed: number; name: string; team: string; avatar: string | null; record: string; pf: number; streak: string };
export type DemoData = {
  week: number;
  last: number;
  leader: { rosterId: number; name: string; team: string; avatar: string | null };
  rolls: { last: { me: number; them: number; opp: string } | null; now: { me: number; them: number; opp: string } | null };
  top: Top[];
  standings: Row[];
  mow: { name: string; team: string; points: number; avatar: string | null } | null;
};

/** One module on the page: its name, what it uses, then the thing itself. */
function Mod({ icon, title, tech, note, children }: { icon: IconName; title: string; tech: string; note: string; children: ReactNode }) {
  return (
    <section className={`${w.widget} ${w.l}`}>
      <div className={w.head}>
        <Icon name={icon} className={w.headIcon} />
        <span className={w.title}>{title}</span>
        <span className={m.tech}>{tech}</span>
      </div>
      <p className={m.note}>{note}</p>
      {children}
    </section>
  );
}

function Face({ src, size = 40 }: { src: string | null; size?: number }) {
  return (
    <span className={m.face} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : null}
    </span>
  );
}

export default function Demos({ data, children }: { data: DemoData; children: ReactNode }) {
  const toast = useToast();
  const [which, setWhich] = useState<'last' | 'now'>('last');
  const [player, setPlayer] = useState<Top | null>(null);
  const [alerts, setAlerts] = useState(false);
  const shareBlob = useRef<Blob | null>(null);
  const roll = data.rolls[which];

  useEffect(() => {
    try { setAlerts(localStorage.getItem('lab.alerts') === '1'); } catch {}
    // Fetched ahead of the tap: Safari only lets share() run straight off a tap.
    fetch(`/share/${data.last}/square`).then((r) => (r.ok ? r.blob() : null)).then((b) => { shareBlob.current = b; }).catch(() => {});
  }, [data.last]);

  const confetti = async () => {
    haptic('success');
    const { default: fire } = await import('canvas-confetti');
    const colors = ['#2d4c9c', '#c9dcfa', '#ecf88a', '#ffffff'];
    fire({ particleCount: 90, spread: 70, startVelocity: 38, origin: { y: 0.7 }, colors, disableForReducedMotion: true, scalar: 0.9, zIndex: 2500 });
    window.setTimeout(() => fire({ particleCount: 50, spread: 110, startVelocity: 26, origin: { y: 0.65 }, colors, disableForReducedMotion: true, scalar: 0.8, zIndex: 2500 }), 180);
  };

  const share = async () => {
    const blob = shareBlob.current;
    const file = blob ? new File([blob], `splash-week-${data.last}.png`, { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Week ${data.last}, Splash` });
      else if (navigator.share) await navigator.share({ title: `Week ${data.last}, Splash`, url: `${location.origin}/share/${data.last}/square` });
      else {
        await navigator.clipboard.writeText(`${location.origin}/share/${data.last}/square`);
        toast({ title: 'Link copied', body: `Week ${data.last} card` });
      }
    } catch {}
  };

  return (
    <div className={w.grid}>
      <Mod icon="trending" title="Rolling numbers" tech="NumberFlow" note={`Scores roll digit by digit instead of snapping. ${data.leader.name}, first in the standings, week ${data.last} against week ${data.week}.`}>
        <Segmented
          label="Week"
          value={which}
          onChange={setWhich}
          options={[{ value: 'last', label: `Week ${data.last}` }, { value: 'now', label: `Week ${data.week}` }]}
        />
        {roll ? (
          <div className={m.rollRow}>
            <span className={m.rollSide}>
              <b>{data.leader.name}</b>
              <Rolling className={`${m.rollNum} ${roll.me >= roll.them ? m.lead : ''}`} value={roll.me} />
            </span>
            <span className={m.rollSide}>
              <b>{roll.opp}</b>
              <Rolling className={`${m.rollNum} ${roll.them > roll.me ? m.lead : ''}`} value={roll.them} />
            </span>
          </div>
        ) : (
          <p className={m.note}>No game that week</p>
        )}
      </Mod>

      <Mod icon="person" title="Bottom sheet" tech="Motion drag" note={`Tap a player. The sheet rises over the page, the page eases back, and a flick down closes it. Week ${data.last}'s top scorers.`}>
        <ul className={m.rows}>
          {data.top.slice(0, 4).map((p) => (
            <li key={p.id}>
              <Press className={m.row} onClick={() => setPlayer(p)}>
                <Face src={p.headshot} />
                <span className={m.rowText}>
                  <b>{p.name}</b>
                  <span>
                    {p.position}
                    {p.team ? `, ${p.team}` : ''}
                    {p.owner ? `, ${p.owner}` : ''}
                  </span>
                </span>
                <span className={m.pts}>{p.points.toFixed(2)}</span>
              </Press>
            </li>
          ))}
        </ul>
      </Mod>

      <Mod icon="bell" title="Toasts" tech="Motion presence" note="Scoring news drops in from the top and stacks like iOS notifications. Flick one up to clear it. On Gameday Live these come from real scoring.">
        <div>
          <Press
            className={pill.pillBtn}
            onClick={() => {
              data.top.slice(0, 3).forEach((p, i) =>
                window.setTimeout(
                  () => toast({ image: p.headshot, title: p.name, body: `Week ${data.last}${p.owner ? `, ${p.owner}` : ''}`, value: p.points.toFixed(2), tone: 'good' }),
                  i * 450
                )
              );
            }}
          >
            Replay week {data.last}&rsquo;s top three
          </Press>
        </div>
      </Mod>

      <div className={m.full}>{children}</div>

      <Mod icon="clipboard" title="Animated folds" tech="CSS grid rows" note="Sections open to their real height instead of snapping, Safari included, with no measuring.">
        <Reveal head={<b className={m.revealHead}>Full standings</b>}>
          <ol className={m.stand}>
            {data.standings.map((s) => (
              <li key={s.rosterId} className={s.seed === 8 ? m.lineAbove : ''}>
                <span className={m.seed}>{s.seed}</span>
                <Face src={s.avatar} size={28} />
                <span className={m.rowText}>
                  <b>{s.name}</b>
                  <span>{s.team}</span>
                </span>
                <span className={m.rec}>{s.record}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </Mod>

      <Mod icon="play" title="Snap rail" tech="Scroll driven CSS" note="Cards settle on the center with native momentum, and grow as they arrive. No JavaScript.">
        <div className={m.rail}>
          {data.top.map((p) => (
            <Link key={p.id} href={`/players/${p.id}`} className={m.railCard}>
              <Face src={p.headshot} size={56} />
              <b>{p.name}</b>
              <span>{p.points.toFixed(2)} points</span>
            </Link>
          ))}
        </div>
      </Mod>

      <Mod icon="swap" title="Swipe actions" tech="Scroll snap" note="Swipe a row left for its actions, with native momentum and nothing to install.">
        <ul className={m.swipeList}>
          {data.standings.slice(0, 3).map((s) => (
            <li key={s.rosterId} className={m.swipe}>
              <div className={m.swipeFace}>
                <Face src={s.avatar} size={36} />
                <span className={m.rowText}>
                  <b>{s.name}</b>
                  <span>
                    {s.record}, {s.pf.toFixed(2)} points for
                  </span>
                </span>
                <span className={m.swipeHint} aria-hidden />
              </div>
              <Link href={`/managers/${s.rosterId}`} className={m.swipeAct}>
                Team
              </Link>
              <Link href={`/lab/rivals?a=${s.rosterId}`} className={`${m.swipeAct} ${m.swipeAct2}`}>
                Rivals
              </Link>
            </li>
          ))}
        </ul>
      </Mod>

      <Mod icon="more" title="Menus" tech="Popover API" note="A native popover: it opens on the top layer, closes on outside tap or Escape, and animates in with CSS alone.">
        <div className={m.popRow}>
          <span className={m.rowText}>
            <b>{data.leader.team}</b>
            <span>{data.leader.name}</span>
          </span>
          <button type="button" className={m.dots} popoverTarget="lab-menu" aria-label="More">
            <DotsThree weight="bold" />
          </button>
          <div id="lab-menu" popover="auto" className={m.pop}>
            <Link href={`/managers/${data.leader.rosterId}`}>Team page</Link>
            <Link href={`/lab/rivals?a=${data.leader.rosterId}`}>Compare in Rivals</Link>
            <Link href="/lab/race">Playoff picture</Link>
          </div>
        </div>
      </Mod>

      <Mod icon="gear" title="Native switch" tech="iOS haptic" note="A real system switch. On iPhone, flipping it plays the system haptic, the one haptic the web gets on iOS. Saved on this device only.">
        <label className={m.switchRow}>
          <span>Score alerts for my team</span>
          <input
            id="lab-alerts"
            type="checkbox"
            {...{ switch: '' }}
            className={m.switch}
            checked={alerts}
            onChange={(e) => {
              setAlerts(e.target.checked);
              try { localStorage.setItem('lab.alerts', e.target.checked ? '1' : '0'); } catch {}
            }}
          />
        </label>
      </Mod>

      {data.mow ? (
        <Mod icon="confetti" title="Celebrate" tech="canvas-confetti, loaded on tap" note={`Tap the Manager of the Week. The confetti library loads only when it is needed.`}>
          <Press className={m.mow} onClick={confetti} feel="none">
            <Face src={data.mow.avatar} size={48} />
            <span className={m.rowText}>
              <span className={m.kicker}>Manager of the Week, week {data.last}</span>
              <b>{data.mow.name}</b>
              <span>{data.mow.team}</span>
            </span>
            <span className={`${m.pts} ${m.lead}`}>{data.mow.points.toFixed(2)}</span>
          </Press>
        </Mod>
      ) : null}

      <Mod icon="phone" title="Share the image" tech="Web Share with files" note={`Sends week ${data.last}'s card as a picture, straight into the group chat, not a link.`}>
        <div>
          <Press className={pill.pillBtn} onClick={share}>
            <ShareNetwork weight="bold" style={{ marginRight: 6 }} />
            Share week {data.last}
          </Press>
        </div>
      </Mod>

      <Mod icon="football" title="Morphing pages" tech="View Transitions" note="Open a game on Gameday Live: the score card grows into the gamecast instead of the page swapping.">
        <div>
          <Link href="/lab/live" className={pill.pillBtn}>
            Open Gameday Live
          </Link>
        </div>
      </Mod>

      <Sheet open={!!player} onClose={() => setPlayer(null)}>
        {player ? (
          <div className={m.sheetBody}>
            <div className={m.sheetHero}>
              <Face src={player.headshot} size={72} />
              <span className={m.rowText}>
                <b className={m.sheetName}>{player.name}</b>
                <span>
                  {player.position}
                  {player.team ? `, ${player.team}` : ''}
                </span>
                {player.owner ? <span>Rostered by {player.owner}</span> : null}
              </span>
            </div>
            <div className={m.stats}>
              <span>
                <b>{player.points.toFixed(2)}</b>
                Points, week {data.last}
              </span>
              <span>
                <b>{player.slot}</b>
                Slot
              </span>
            </div>
            <div>
              <Link href={`/players/${player.id}`} className={pill.pillBtn}>
                Player page
              </Link>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
