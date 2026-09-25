import LabHeader from '../LabHeader';
import LabTabs from '../LabTabs';

/**
 * Home, proposed. Real Week 2 and 3 numbers, so the hierarchy is judged at the
 * sizes it will actually have.
 *
 * What changed from today's Home: your own matchup leads, because that is the
 * only score most people open the app for. The stories rail keeps its place
 * but loses the dimmed ring, since every manager now opens something. The
 * widget stack below is one column of clearly ranked sections rather than a
 * grid of equal cards.
 */
const YOURS = { you: 'Matt', them: 'Adam', yourPoints: 130.08, theirPoints: 129.42, left: 3, theirLeft: 1 };

const STORIES = [
  { name: 'John', clips: 2 },
  { name: 'Jackson', clips: 1 },
  { name: 'Adam', clips: 1 },
  { name: 'Ben', clips: 1 },
  { name: 'Matt', clips: 0 },
  { name: 'Bearcat', clips: 0 },
];

const SAYINGS = [
  { tag: 'Sit him', who: 'Sean', line: 'Sean is starting J. Reed, who is OUT. A slot spent on a man who is not playing scores exactly nothing.' },
  { tag: 'Start him', who: 'Taylor', line: 'Taylor starts J. Dobbins while A. Mitchell sits, and that is 3.9 points given away before anybody has played.' },
];

export default function LabHome() {
  return (
    <>
      <div className="lab-page">
        <LabHeader section="Home" />

        {/* Your game, first. Nobody opens a fantasy app to read a league table. */}
        <section className="lab-section">
          <div className="lab-section-head">
            <span className="lab-label">Your matchup</span>
            <span className="lab-chip lab-chip-live">
              <i className="lab-dot" /> Live
            </span>
          </div>
          <div className="lab-card lab-yours">
            <div className="lab-yours-side">
              <span className="lab-display lab-h2">{YOURS.you}</span>
              <span className="lab-num lab-yours-score">{YOURS.yourPoints.toFixed(2)}</span>
              <span className="lab-label">{YOURS.left} yet to play</span>
            </div>
            <div className="lab-yours-gap">
              <span className="lab-num lab-yours-margin">+{(YOURS.yourPoints - YOURS.theirPoints).toFixed(2)}</span>
              <span className="lab-label">margin</span>
            </div>
            <div className="lab-yours-side lab-yours-them">
              <span className="lab-display lab-h2">{YOURS.them}</span>
              <span className="lab-num lab-yours-score">{YOURS.theirPoints.toFixed(2)}</span>
              <span className="lab-label">{YOURS.theirLeft} yet to play</span>
            </div>
          </div>
        </section>

        <section className="lab-section">
          <div className="lab-section-head">
            <span className="lab-label">Stories</span>
            <span className="lab-section-link">All 14</span>
          </div>
          <div className="lab-rail">
            {STORIES.map((manager) => (
              <span className="lab-story" key={manager.name}>
                <span className={`lab-story-ring${manager.clips ? ' lab-story-ring-on' : ''}`}>
                  <span className="lab-story-face">{manager.name.slice(0, 2).toUpperCase()}</span>
                </span>
                <span className="lab-label">{manager.name}</span>
              </span>
            ))}
          </div>
        </section>

        <div className="lab-columns">
          <section className="lab-section">
            <div className="lab-section-head">
              <span className="lab-label">Squirtfucius says</span>
              <span className="lab-section-link">Every lineup</span>
            </div>
            <div className="lab-card">
              {SAYINGS.map((saying) => (
                <div className="lab-saying" key={saying.who}>
                  <span className="lab-saying-head">
                    <span className="lab-chip lab-chip-loss">{saying.tag}</span>
                    <span className="lab-saying-who">{saying.who}</span>
                  </span>
                  <p className="lab-body">{saying.line}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="lab-section">
            <div className="lab-section-head">
              <span className="lab-label">The Shartzone</span>
              <span className="lab-section-link">Chug meter</span>
            </div>
            <div className="lab-card lab-shart">
              <span className="lab-shart-emoji" aria-hidden>
                💩
              </span>
              <span className="lab-shart-copy">
                <span className="lab-display lab-h2">Taylor is chugging</span>
                <span className="lab-body">Lowest score of Week 2, 73.52 points. He knows what he did.</span>
              </span>
            </div>
          </section>
        </div>
      </div>
      <LabTabs active="Home" />
    </>
  );
}
