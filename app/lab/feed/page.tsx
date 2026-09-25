import LabHeader from '../LabHeader';
import LabTabs from '../LabTabs';

/**
 * The Feed, proposed. The section rebuilt last week, in the new language.
 *
 * What changed: replays that actually play lead the screen, the filter row is
 * one line of chips rather than three stacked rows, and every moment is one
 * row marked by what it is. Nothing here is a tab that can be empty.
 */
const REELS = [
  'Bijan Robinson bursts into end zone for his 2nd TD',
  'Jordan Love finds Christian Watson for the opening TD',
  'Matthew Golden hauls in 15 yard TD for Packers',
];

const ITEMS = [
  { kind: 'cmon', mark: 'CMON', title: "C'mon Man, Jackson", body: 'Green Bay finished with 7.00 in your FLEX while J. Reed sat on 21.40.', time: '47m' },
  { kind: 'td', mark: 'TD', title: 'TOUCHDOWN, John', body: 'Christian Watson, 14 yard catch. That is 6 for the Packers and 7.4 for John.', time: '1h' },
  { kind: 'clip', mark: 'CLIP', title: 'Bijan Robinson punches in short TD', body: null, time: '1h' },
  { kind: 'lead', mark: 'LEAD', title: 'Bearcat takes the lead over Trip', body: '104.20 to 101.86 with four still to play.', time: '2h' },
];

export default function LabFeed() {
  return (
    <>
      <div className="lab-page">
        <LabHeader section="Feed" />

        <section className="lab-section">
          <div className="lab-section-head">
            <span className="lab-label">Replays</span>
            <span className="lab-section-link">6 playable</span>
          </div>
          <div className="lab-reel-rail">
            {REELS.map((title) => (
              <span className="lab-reel" key={title}>
                <span className="lab-reel-art" aria-hidden>
                  ▶
                </span>
                <span className="lab-reel-title">{title}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="lab-section">
          <div className="lab-section-head">
            <span className="lab-label">Everything</span>
            <span className="lab-section-link">112 moments</span>
          </div>
          <div className="lab-rail" style={{ gap: 6 }}>
            {['All', 'Replays 52', 'Touchdowns 27', "C'mon Man 14", 'Leads 12'].map((chip, i) => (
              <span key={chip} className={`lab-chip${i === 0 ? ' lab-chip-live' : ''}`}>
                {chip}
              </span>
            ))}
          </div>
          <div className="lab-card">
            {ITEMS.map((item) => (
              <div className="lab-feed-row" key={item.title}>
                <span className={`lab-feed-mark lab-feed-mark-${item.kind}`}>{item.mark}</span>
                <span className="lab-feed-body">
                  <span className="lab-feed-head">
                    <span className="lab-feed-title">{item.title}</span>
                    <span className="lab-feed-time">{item.time}</span>
                  </span>
                  {item.body ? <span className="lab-body">{item.body}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <LabTabs active="Feed" />
    </>
  );
}
