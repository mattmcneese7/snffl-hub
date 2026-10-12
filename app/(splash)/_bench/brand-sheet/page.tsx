import type { Metadata } from 'next';
import { MarkDropRefined } from '../../marks';
import AppIcon from '../../home/AppIcon';
import Icon, { ICON_NAMES } from '../../home/Icons';
import Squirt, { type Mood, type Prop } from '../../home/Squirt';
import { WidgetHead } from '../../home/Widget';
import w from '../../home/widgets.module.css';
import bench from '../../testing.module.css';
import s from './sheet.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Splash brand sheet' },
  robots: { index: false, follow: false },
};

const FONTS = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const CAVEAT = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap';

/** Pool, with each color's one job and its contrast where it carries text. */
const COLORS = [
  { name: 'Paper', hex: '#f7f6f2', job: 'The ground. The wallpaper sits on it.', text: '#141518' },
  { name: 'White', hex: '#ffffff', job: 'Every card and pill. Text lives here.', text: '#141518' },
  { name: 'Powder', hex: '#c9dcfa', job: 'Structure and selection: discs, your row, the chosen menu item.', text: '#141518' },
  { name: 'Lime', hex: '#ecf88a', job: 'Emphasis only: one marked phrase, the Shart, bad news. Never text.', text: '#141518' },
  { name: 'Deep blue', hex: '#2d4c9c', job: 'The drop, links, labels, live. 8.0 to 1 on white.', text: '#ffffff' },
  { name: 'Ink', hex: '#141518', job: 'Type. 18.3 to 1 on white.', text: '#ffffff' },
  { name: 'Ink 2', hex: '#3d434e', job: 'Reading text. 9.9 to 1 on white.', text: '#ffffff' },
  { name: 'Ink 3', hex: '#5a616d', job: 'Supporting text. 6.2 to 1 on white.', text: '#ffffff' },
];

const SCALE = [
  { size: 46, weight: 900, use: 'Page title, once', sample: 'Splash' },
  { size: 28, weight: 900, use: 'Squirt’s headline', sample: 'Cook’d is cooking.' },
  { size: 22, weight: 800, use: 'Widget hero lines', sample: 'Hog Tied, Deep Fried' },
  { size: 17, weight: 700, use: 'Lead lines', sample: '5 games on the field' },
  { size: 15, weight: 700, use: 'Widget titles', sample: 'Scoreboard' },
  { size: 14, weight: 500, use: 'Lists, buttons', sample: 'All matchups' },
  { size: 13, weight: 400, use: 'Reading, detail', sample: 'Lost to Zyn-bo Squisher, 112.70 to 73.02.' },
  { size: 11, weight: 700, use: 'Labels, uppercase', sample: 'SHART WATCH' },
];

const MOODS: { mood: Mood; prop?: Prop; note: string }[] = [
  { mood: 'calm', note: 'Nothing on the line' },
  { mood: 'smug', note: 'Cooking' },
  { mood: 'sweat', note: 'Close, still going' },
  { mood: 'gloom', note: 'Buried' },
  { mood: 'sleep', note: 'Nothing happening' },
  { mood: 'smug', prop: 'crown', note: 'Top of the table' },
  { mood: 'smug', prop: 'stein', note: 'Owes, or is owed' },
];

const MOTION = [
  ['The drip', 'Live drops fall a hair and squash every few seconds.'],
  ['The highlighter', 'The marked phrase swipes on, left to right, once.'],
  ['Count up', 'Scores count to themselves the first time they are seen.'],
  ['The intro', 'The drop falls, rings spread, the name rises, the lockup flies to the top bar.'],
  ['Parallax', 'The wallpaper scrolls at 0.7 of the page.'],
  ['Moments', 'Confetti, the flush, the pour: once each, when earned.'],
  ['Reduced motion', 'All of it off, or settled where it would land.'],
];

/**
 * Splash on one page: the lockup, the icon, Pool, the type, the icon set,
 * Squirt, the widget, motion and voice. Built from the real components, so
 * the sheet and the app cannot drift apart.
 */
export default function BrandSheet() {
  return (
    <div className={`${bench.stage} ${s.sheet}`} data-stage>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTS} precedence="default" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={CAVEAT} precedence="default" />
      <main className={s.page}>
        <header className={s.intro}>
          <p className={s.kicker}>Brand sheet</p>
          <h1 className={s.h1}>Splash</h1>
          <p className={s.lede}>The app for the Squirtnite FFL. Everything it looks and sounds like, on one page.</p>
        </header>

        {/* ---------- The lockup ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>The lockup</h2>
          <p className={s.note}>
            The drop is a football: laces down the middle, a seam under the tip and across the foot. Deep blue beside
            the word in ink. The gap between them is three tenths of the drop.
          </p>
          <div className={s.lockups}>
            <div className={`${s.lockupTile} ${s.onPaper}`}>
              <span className={s.lockup}>
                <span className={s.lockMark}>
                  <MarkDropRefined />
                </span>
                Splash
              </span>
            </div>
            <div className={`${s.lockupTile} ${s.onDeep}`}>
              <span className={`${s.lockup} ${s.reversed}`}>
                <span className={s.lockMark}>
                  <MarkDropRefined />
                </span>
                Splash
              </span>
            </div>
          </div>
          <div className={s.sizesRow}>
            {[48, 32, 20, 16].map((n) => (
              <span key={n} className={s.sizeCell}>
                <span className={s.markAt} style={{ width: n, height: n }}>
                  <MarkDropRefined />
                </span>
                <span>{n}px</span>
              </span>
            ))}
          </div>
        </section>

        {/* ---------- The icon ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>The app icon</h2>
          <p className={s.note}>Paper: the deep blue drop on the app's own paper, the mark as it sits in the top bar. Full bleed; the phone rounds it.</p>
          <div className={s.sizesRow}>
            <AppIcon variant="paper" size={120} />
            <AppIcon variant="paper" size={60} />
            <AppIcon variant="paper" size={40} />
            <AppIcon variant="paper" size={16} round={false} />
          </div>
        </section>

        {/* ---------- Pool ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>Pool, the colors</h2>
          <ul className={s.swatches}>
            {COLORS.map((c) => (
              <li key={c.name} className={s.swatch}>
                <span className={s.chip} style={{ background: c.hex, color: c.text }}>
                  {c.hex}
                </span>
                <span className={s.swatchText}>
                  <b>{c.name}</b>
                  <span>{c.job}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Type ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>Type</h2>
          <p className={s.note}>Switzer for everything. One scale; the weight does the work.</p>
          <ul className={s.scale}>
            {SCALE.map((t) => (
              <li key={t.size} className={s.scaleRow}>
                <span className={s.scaleSpec}>
                  {t.size}/{t.weight}
                </span>
                <span className={s.scaleSample} style={{ fontSize: Math.min(t.size, 34), fontWeight: t.weight }}>
                  {t.sample}
                </span>
                <span className={s.scaleUse}>{t.use}</span>
              </li>
            ))}
          </ul>
          <div className={s.hand}>
            <span className={s.handSample}>ouch</span>
            <span className={s.note}>The hand: Caveat, for Squirt&rsquo;s scribbles and nothing else.</span>
          </div>
        </section>

        {/* ---------- Icons ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>The icon set</h2>
          <p className={s.note}>Phosphor&rsquo;s duotone, worn in Pool: a face and a line, recolored per place.</p>
          <div className={s.icons}>
            {ICON_NAMES.map((n) => (
              <span key={n} className={s.iconCell} title={n}>
                <Icon name={n} className={s.iconDisc} />
              </span>
            ))}
          </div>
        </section>

        {/* ---------- Squirt ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>Squirt</h2>
          <p className={s.note}>The league&rsquo;s character. The mark is the logo; Squirt is the personality.</p>
          <div className={s.moods}>
            {MOODS.map((m) => (
              <span key={`${m.mood}-${m.prop ?? ''}`} className={s.moodCell}>
                <Squirt mood={m.mood} size={64} prop={m.prop} />
                <span>{m.note}</span>
              </span>
            ))}
          </div>
        </section>

        {/* ---------- The widget ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>The widget</h2>
          <p className={s.note}>
            One white card, three sizes on a two column grid. Cards 12px from the screen, text 16px inside them, 20px
            between widgets, 22px corners. Every widget opens the same way.
          </p>
          <div className={s.widgetDemo}>
            <section className={`${w.widget} ${w.m}`}>
              <WidgetHead icon="football" title="Scoreboard" href="/" more="Every game" />
              <p className={w.empty}>The icon, the name, and the way further in, on one line.</p>
            </section>
          </div>
        </section>

        {/* ---------- Motion ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>Motion</h2>
          <dl className={s.motion}>
            {MOTION.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- Voice ---------- */}
        <section className={s.card}>
          <h2 className={s.h2}>Voice</h2>
          <ul className={s.voice}>
            <li>
              <b>The app is plain where you navigate.</b> Page names are page names.
            </li>
            <li>
              <b>Squirt is the group chat&rsquo;s sharpest friend.</b> Specific, one beat per line, real numbers only.
            </li>
            <li>
              <b>The league&rsquo;s own words.</b> The Shart, the chug, the long walk, cooking, Nobody breathe.
            </li>
            <li>
              <b>No em dashes, ever.</b> Curly quotes, contractions, digits for counts.
            </li>
          </ul>
          <p className={s.note}>The full guide is VOICE.md, next to this page in the repo.</p>
        </section>
      </main>
    </div>
  );
}
