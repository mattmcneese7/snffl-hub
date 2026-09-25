'use client';

import { DownMark, UpMark } from './Marks';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StorySlide } from '@/lib/week-story';

/**
 * The week in 90 seconds, Checkpoint 10.
 *
 * Five slides, auto advancing, tap the right half to skip and the left half
 * to go back. It borrows the progress bar and tap targets from the highlight
 * reel because they are the same gesture, but not its scroller: these slides
 * are laid out rather than filmed, so they cross fade in place instead of
 * being swiped through a list.
 *
 * Auto advance stops the moment anyone taps. Somebody who is reading a slide
 * and reaches for the next one should not be fighting a timer for the one
 * after it.
 */
const HOLD = 4500;

export default function WeekStory({
  slides,
  onClose,
}: {
  slides: StorySlide[];
  onClose: () => void;
}) {
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
    [slides.length, close]
  );

  // The timer only runs while nobody has taken over.
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') go(active + 1);
      if (event.key === 'ArrowLeft') go(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go, close]);

  if (!mounted || !slides.length) return null;
  const slide = slides[active];

  return createPortal(
    <div className="snffl-reel snffl-reel-story snffl-wstory" role="dialog" aria-modal="true" aria-label={`Week ${slide.week} in 90 seconds`}>
      <div className="snffl-story-progress" aria-hidden>
        {slides.map((s, i) => (
          <i
            key={`${s.kind}-${i}`}
            className={i < active ? 'done' : i === active ? (auto ? 'now' : 'done') : ''}
          />
        ))}
      </div>

      <header className="snffl-reel-top">
        <span className="snffl-reel-title">
          <strong>Week {slide.week}</strong>
          <span className="snffl-reel-count">
            {active + 1} / {slides.length}
          </span>
        </span>
        <button type="button" className="snffl-reel-close" onClick={close} aria-label="Close">
          &times;
        </button>
      </header>

      <div className="snffl-wstory-stage">
        {/* Real football behind every slide, picked for the manager it is
            about. The top play slide runs its own footage, resolved on the
            server so the slide only exists when the video does; the rest take
            a wire photograph of somebody that manager started. */}
        {slide.kind === 'play' ? (
          <video
            key={`play-${active}`}
            className="snffl-story-backdrop snffl-wstory-video"
            src={slide.video}
            poster={slide.art.still ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        ) : slide.kind === 'shakeup' && slide.montage.length ? (
          <Montage clips={slide.montage} poster={slide.art.still} key={`montage-${active}`} />
        ) : (
          <Backdrop art={slide.art} key={`${slide.kind}-${active}`} />
        )}

        <button
          type="button"
          className="snffl-story-tap snffl-story-tap-back"
          aria-label="Previous"
          onClick={() => go(active - 1)}
        />
        <button
          type="button"
          className="snffl-story-tap snffl-story-tap-next"
          aria-label="Next"
          onClick={() => go(active + 1)}
        />

        <Slide slide={slide} />
      </div>

      <footer className="snffl-wstory-foot">
        <ShareRow week={slide.week} index={active} kind={slide.kind} />
      </footer>
    </div>,
    document.body
  );
}

/**
 * The week's plays, one after another, behind the table.
 *
 * Each clip runs to its end and hands over to the next rather than being cut
 * at a fixed interval, so no play is ever clipped mid catch, and the last one
 * wraps to the first. One element with a changing source rather than a stack
 * of them: four videos all decoding at once to show one is how a phone gets
 * hot holding a story.
 */
function Montage({ clips, poster }: { clips: string[]; poster: string | null }) {
  const [at, setAt] = useState(0);
  return (
    <video
      className="snffl-story-backdrop snffl-wstory-video"
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

/**
 * The picture behind a slide.
 *
 * The still paints immediately and the clip fades in over it once it can
 * play, so the slide is never empty while a video negotiates. Muted, looping
 * and inert: it is scenery, and a story that pauses for buffering has stopped
 * being 90 seconds long.
 */
function Backdrop({ art }: { art: { still: string | null; espnId: string | null } }) {
  const [video, setVideo] = useState<string | null>(null);
  // ESPN clips carry no thumbnail in our table, but the clip endpoint hands
  // one back with the sources. Taking it means an ESPN backed slide gets a
  // real frame of the play rather than falling all the way to an avatar.
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    if (!art.espnId) return;
    let dead = false;
    (async () => {
      const { clipSource } = await import('@/lib/espn-playback');
      const source = await clipSource(art.espnId!).catch(() => null);
      if (dead || !source) return;
      if (source.poster) setPoster(source.poster);
      // The progressive file only. Scenery does not justify pulling hls.js
      // into the bundle, and a clip with no mp4 simply stays a still.
      if (source.mp4) setVideo(source.mp4);
    })();
    return () => {
      dead = true;
    };
  }, [art.espnId]);

  const still = poster ?? art.still;
  if (!still && !video) return null;
  return (
    <>
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="snffl-story-backdrop" src={still} alt="" aria-hidden />
      ) : null}
      {video ? (
        <video
          className="snffl-story-backdrop snffl-wstory-video"
          src={video}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : null}
    </>
  );
}

/**
 * The caption under the big number, unless it is the big number again.
 *
 * A trophy's detail is often just "136.88 points", which is what the display
 * figure above it already says. Saying it twice makes the slide look like it
 * ran out of things to tell you.
 */
function caption(detail: string, value: number): string | null {
  return detail.includes(value.toFixed(2)) ? null : detail;
}

function Slide({ slide }: { slide: StorySlide }) {
  switch (slide.kind) {
    case 'intro':
      return (
        <div className="snffl-wstory-card">
          <span className="snffl-wstory-kicker">The week in 90 seconds</span>
          <strong className="snffl-wstory-huge">Week {slide.week}</strong>
          <p className="snffl-wstory-line">
            {slide.games} games. {slide.topTeam} led everyone with{' '}
            <b className="snffl-numeric">{slide.topScore.toFixed(2)}</b>.
          </p>
        </div>
      );
    case 'motw':
      return (
        <div className="snffl-wstory-card snffl-wstory-champ">
          {/* Gems, because winning the week should feel like something. They
              are generated rather than listed so the fall never repeats in the
              same pattern twice, and they sit behind the copy. */}
          <span className="snffl-gems" aria-hidden>
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  animationDelay: `${(i % 9) * 0.34}s`,
                  animationDuration: `${2.6 + ((i * 7) % 5) * 0.32}s`,
                  transform: `scale(${0.7 + ((i * 3) % 5) * 0.16})`,
                }}
              />
            ))}
          </span>
          {slide.avatar ? (
            <span className="snffl-wstory-crowned">
              <span className="snffl-wstory-crown" aria-hidden>
                &#9819;
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="snffl-wstory-avatar" src={slide.avatar} alt="" />
            </span>
          ) : null}
          <span className="snffl-wstory-kicker">Manager of the week</span>
          <strong className="snffl-wstory-name">{slide.team}</strong>
          {slide.manager && slide.manager !== slide.team ? (
            <span className="snffl-wstory-sub">{slide.manager}</span>
          ) : null}
          <strong className="snffl-wstory-huge snffl-numeric">{slide.value.toFixed(2)}</strong>
          {caption(slide.detail, slide.value) ? (
            <p className="snffl-wstory-line">{caption(slide.detail, slide.value)}</p>
          ) : null}
          {slide.star ? (
            <span className="snffl-wstory-star">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="snffl-wstory-star-face" src={slide.star.headshot} alt="" />
              <span className="snffl-wstory-star-body">
                <strong>{slide.star.name}</strong>
                <span className="snffl-numeric">{slide.star.points.toFixed(2)} carried it</span>
              </span>
            </span>
          ) : null}
        </div>
      );
    case 'shart':
      return (
        <div className="snffl-wstory-card snffl-wstory-shart">
          {/* The stink. Four plumes on different delays and drifts, rising
              through the slide and dissipating, with the card itself swaying
              very slightly so the whole thing feels unwell. */}
          <span className="snffl-stink" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${12 + i * 19}%`,
                  animationDelay: `${i * 0.7}s`,
                  animationDuration: `${3.4 + (i % 3) * 0.6}s`,
                }}
              />
            ))}
          </span>
          {/* The stamp, per the brief. */}
          <span className="snffl-wstory-stamp" aria-hidden>
            Shart
          </span>
          <span className="snffl-wstory-kicker">Shart of the week</span>
          <strong className="snffl-wstory-name">{slide.team}</strong>
          {slide.manager && slide.manager !== slide.team ? (
            <span className="snffl-wstory-sub">{slide.manager}</span>
          ) : null}
          <strong className="snffl-wstory-huge snffl-numeric">{slide.value.toFixed(2)}</strong>
          {caption(slide.detail, slide.value) ? (
            <p className="snffl-wstory-line">{caption(slide.detail, slide.value)}</p>
          ) : null}
          {slide.star ? (
            <p className="snffl-wstory-line snffl-wstory-cope">
              Best on the roster: {slide.star.name},{' '}
              <b className="snffl-numeric">{slide.star.points.toFixed(2)}</b>.
            </p>
          ) : null}
        </div>
      );
    case 'play':
      return (
        <div className="snffl-wstory-card snffl-wstory-topplay">
          <span className="snffl-wstory-kicker">Top play</span>
          <strong className="snffl-wstory-name">{slide.headline}</strong>
          <p className="snffl-wstory-line">
            {slide.points != null ? (
              <>
                <b className="snffl-numeric">{slide.points.toFixed(2)}</b> points
              </>
            ) : null}
            {slide.manager ? ` for ${slide.manager}` : ''}
          </p>
        </div>
      );
    case 'shakeup':
      return (
        <div className="snffl-wstory-card">
          <span className="snffl-wstory-kicker">Standings shake up</span>
          <ul className="snffl-wstory-movers">
            {slide.movers.map((m) => {
              const up = m.to < m.from;
              return (
                <li key={m.rosterId}>
                  {/* Also drawn: the solid triangles are emoji on iOS too. */}
                  {up ? (
                    <UpMark className="snffl-wstory-arrow up" />
                  ) : (
                    <DownMark className="snffl-wstory-arrow down" />
                  )}
                  <span className="snffl-wstory-mover">
                    <strong>{m.team}</strong>
                    <span>{m.manager}</span>
                  </span>
                  <span className="snffl-numeric">
                    {m.from} &rarr; {m.to}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
  }
}

/**
 * Share and save, per slide.
 *
 * Share uses the native sheet where there is one and falls back to copying
 * the link, because a button that silently does nothing on a desktop is worse
 * than one that says what it did. Save Image opens the generated 1080 by 1920
 * rather than drawing a second copy of the slide in a canvas here.
 */
function ShareRow({ week, index, kind }: { week: number; index: number; kind: string }) {
  const [said, setSaid] = useState<string | null>(null);
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/rag/${week}`;
  const image = `/api/share/${week}/slide?i=${index}`;

  const share = async () => {
    const data = { title: `SQUIRT Week ${week}`, text: `Week ${week}: ${kind}`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
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
      <button type="button" className="snffl-wstory-action" onClick={share}>
        {said ?? 'Share'}
      </button>
      <a className="snffl-wstory-action" href={image} target="_blank" rel="noopener noreferrer">
        Save image
      </a>
    </>
  );
}
