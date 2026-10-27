'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { firstNameOf } from '@/config/managers';
import type { StorySlide } from '@/lib/week-story';
import { Ms } from '../icons';
import AwardIcon from './AwardIcon';
import { storyStage as st } from '../ui/blocks/StoryStage';

/**
 * The week in 90 seconds: five slides over real football, advancing on their
 * own, a tap on the right half for the next and the left for the last. Auto
 * advance stops the moment anyone taps, so nobody fights a timer while
 * reading. Escape or the close button leaves.
 */
const HOLD = 4500;
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th'];

export default function Story({ slides, onClose }: { slides: StorySlide[]; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const close = useCallback(() => onClose(), [onClose]);

  const go = useCallback(
    (index: number) => {
      setAuto(false);
      if (index < 0) return;
      if (index >= slides.length) return close();
      setActive(index);
    },
    [slides.length, close],
  );

  useEffect(() => {
    if (!auto) return;
    const id = setTimeout(() => {
      setActive((i) => {
        if (i + 1 >= slides.length) {
          close();
          return i;
        }
        return i + 1;
      });
    }, HOLD);
    return () => clearTimeout(id);
  }, [auto, active, slides.length, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(active + 1);
      if (e.key === 'ArrowLeft') go(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go, close]);

  if (!mounted || !slides.length) return null;
  const slide = slides[active];

  return createPortal(
    <div className={st.wrap} role="dialog" aria-modal="true" aria-label={`Week ${slide.week} in 90 seconds`}>
      <div className={st.stage}>
        {slide.kind === 'play' ? (
          <video key={`play-${active}`} className={st.media} src={slide.video} poster={slide.art.still ?? undefined} autoPlay muted loop playsInline aria-hidden />
        ) : slide.kind === 'shakeup' && slide.montage.length ? (
          <Montage key={`montage-${active}`} clips={slide.montage} poster={slide.art.still} />
        ) : (
          <Backdrop key={`${slide.kind}-${active}`} art={slide.art} />
        )}
        <span className={st.scrim} aria-hidden />
      </div>

      <div className={st.progress} aria-hidden>
        {slides.map((s, i) => (
          <i key={`${s.kind}-${i}`} className={i < active ? st.done : i === active ? (auto ? st.now : st.done) : ''} />
        ))}
      </div>
      <header className={st.top}>
        <span>
          <b>Week {slide.week}</b>
          <small>
            {active + 1} of {slides.length}
          </small>
        </span>
        <button type="button" className={st.close} onClick={close} aria-label="Close">
          <Ms name="close" size={22} />
        </button>
      </header>

      <button type="button" className={`${st.tap} ${st.back}`} aria-label="Previous" onClick={() => go(active - 1)} />
      <button type="button" className={`${st.tap} ${st.next}`} aria-label="Next" onClick={() => go(active + 1)} />

      <div key={active} className={st.card}>
        <Slide slide={slide} />
      </div>

      <footer className={st.foot}>
        <ShareRow week={slide.week} index={active} />
      </footer>
    </div>,
    document.body,
  );
}

/** The week's plays one after another behind the table, each run to its end. */
function Montage({ clips, poster }: { clips: string[]; poster: string | null }) {
  const [at, setAt] = useState(0);
  return (
    <video
      className={st.media}
      src={clips[at % clips.length]}
      poster={poster ?? undefined}
      autoPlay
      muted
      playsInline
      aria-hidden
      onEnded={() => setAt((i) => (i + 1) % clips.length)}
    />
  );
}

/** The still first, the clip faded in over it once it can play. */
function Backdrop({ art }: { art: { still: string | null; espnId: string | null } }) {
  const [video, setVideo] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  useEffect(() => {
    if (!art.espnId) return;
    let dead = false;
    (async () => {
      const { clipSource } = await import('@/lib/espn-playback');
      const source = await clipSource(art.espnId!).catch(() => null);
      if (dead || !source) return;
      if (source.poster) setPoster(source.poster);
      if (source.mp4) setVideo(source.mp4);
    })();
    return () => {
      dead = true;
    };
  }, [art.espnId]);
  const still = poster ?? art.still;
  return (
    <>
      {still ? <img className={st.media} src={still} alt="" aria-hidden /> : null}
      {video ? <video className={`${st.media} ${st.fadeIn}`} src={video} autoPlay muted loop playsInline aria-hidden /> : null}
    </>
  );
}

/** The caption under the big number, unless it only says the number again. */
const caption = (detail: string, value: number) => (detail.includes(value.toFixed(2)) ? null : detail);

function Slide({ slide }: { slide: StorySlide }) {
  switch (slide.kind) {
    case 'intro':
      return (
        <>
          <small className={st.kicker}>The Week in 90 Seconds</small>
          <b className={st.huge}>Week {slide.week}</b>
          <p className={st.line}>
            {slide.games} games. {slide.topTeam} led everyone with <b>{slide.topScore.toFixed(2)}</b>.
          </p>
        </>
      );
    case 'motw':
    case 'shart':
      return (
        <>
          <span className={st.who}>
            {slide.avatar ? <img className={st.avatar} src={slide.avatar} alt="" /> : null}
            <AwardIcon kind={slide.kind} size={14} tone={slide.kind === 'motw' ? 'gold' : 'bad'} />
          </span>
          <small className={st.kicker}>{slide.kind === 'motw' ? 'Manager of the Week' : 'Shart of the Week'}</small>
          <b className={st.name}>{slide.team}</b>
          <span className={st.sub}>{firstNameOf(slide.rosterId) ?? slide.manager}</span>
          <b className={`${st.huge} ${slide.kind === 'shart' ? st.bad : ''}`}>{slide.value.toFixed(2)}</b>
          {caption(slide.detail, slide.value) ? <p className={st.line}>{caption(slide.detail, slide.value)}</p> : null}
          {slide.star ? (
            slide.kind === 'motw' ? (
              <span className={st.star}>
                <img src={slide.star.headshot} alt="" />
                <span>
                  <b>{slide.star.name}</b>
                  <small>{slide.star.points.toFixed(2)} pts, the top starter</small>
                </span>
              </span>
            ) : (
              <p className={st.line}>
                Best on the roster: {slide.star.name}, <b>{slide.star.points.toFixed(2)}</b>.
              </p>
            )
          ) : null}
        </>
      );
    case 'play':
      return (
        <>
          <small className={st.kicker}>Top Play</small>
          <b className={st.name}>{slide.headline}</b>
          <p className={st.line}>
            {slide.points != null ? (
              <>
                <b>{slide.points.toFixed(2)}</b> pts
              </>
            ) : null}
            {slide.manager ? ` for ${slide.manager}` : ''}
          </p>
        </>
      );
    case 'shakeup':
      return (
        <>
          <small className={st.kicker}>Standings Shake Up</small>
          <ul className={st.movers}>
            {slide.movers.map((m) => {
              const up = m.to < m.from;
              return (
                <li key={m.rosterId}>
                  <span>
                    <b>{m.team}</b>
                    <small>{firstNameOf(m.rosterId) ?? m.manager}</small>
                  </span>
                  <span className={up ? st.good : st.bad}>
                    {up ? 'Up' : 'Down'} {Math.abs(m.from - m.to)}
                  </span>
                  <span className={st.seat}>
                    {ORD[m.from] ?? m.from} to {ORD[m.to] ?? m.to}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      );
  }
}

/** Share uses the phone's sheet where there is one, else copies the link and says so. */
function ShareRow({ week, index }: { week: number; index: number }) {
  const [said, setSaid] = useState<string | null>(null);
  const share = async () => {
    const url = `${window.location.origin}/lab/app/rag/${week}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Splash, week ${week}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setSaid('Link copied');
    } catch {
      setSaid('Could not share');
    }
    setTimeout(() => setSaid(null), 2000);
  };
  return (
    <>
      <button type="button" className={st.action} onClick={() => void share()}>
        {said ?? 'Share'}
      </button>
      <a className={st.action} href={`/api/share/${week}/slide?i=${index}`} target="_blank" rel="noopener noreferrer">
        Save image
      </a>
    </>
  );
}
