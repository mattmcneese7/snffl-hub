import type { Metadata } from 'next';
import Link from 'next/link';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget from '../home/Widget';
import w from '../home/widgets.module.css';
import home from '../home/home.module.css';
import v from './versions.module.css';

export const metadata: Metadata = { title: { absolute: 'Versions, Splash' }, robots: { index: false, follow: false } };

/**
 * The versions easter egg: every name this app has had, each still running.
 *
 * Reached only by tapping "Splash 3.0" at the foot of More seven times in
 * three seconds. Nothing links here.
 *
 * Every fact below is read from the repo, not written for the page:
 *   - Names from app/layout.tsx at each sha (git show <sha>:app/layout.tsx).
 *     SNFFL and Squirtnite both ship the title "Squirtnite FFL" with the home
 *     screen name SNFFL; Night Glass (033ba8c) is what set the second apart.
 *   - Dates are the era's first and last commit dates in git log.
 *   - Lines and highlights are commit subjects from the era, trimmed.
 *   - URLs are each era's production deployment, from the GitHub Deployments
 *     API (deployments?sha=<sha>, then its statuses' environment_url).
 *     25c56ec, the last Night Glass commit, has no deployment of its own, so
 *     Squirtnite opens 7237cd7, the nearest earlier commit that has one.
 *   - Splash has no commits yet; its line and highlights are from PARITY.md.
 *
 * The deployment URLs sit behind Vercel's deployment protection until it is
 * turned off for the project; until then they redirect to a Vercel sign in.
 */
type Era = {
  name: string;
  built: string;
  build: string;
  line: string;
  highlights: string[];
  href: string;
  external: boolean;
};

const ERAS: Era[] = [
  {
    name: 'SNFFL',
    built: 'September 15 to 17, 2026',
    build: '37b191a',
    line: 'The first build, checkpoint by checkpoint: the core pages, the SquirtRag writing pipeline and the live layer.',
    highlights: [
      'SNFFL brand marks',
      'The SquirtRag writing pipeline',
      'The live layer: watcher, feed storage and the Feed',
      'Player research: season stats, sort and filter, team colors',
      'Push alerts, chug reminders and the Postseason Breakdown',
    ],
    href: 'https://snffl-1hnjykcuu-matt-fe9b.vercel.app',
    external: true,
  },
  {
    name: 'Squirtnite',
    built: 'September 18 to 25, 2026',
    build: '7237cd7',
    line: 'Night Glass site wide: glass panels, the live matchup board, lines and the DraftSharks feed.',
    highlights: [
      'Live scores from Sleeper every 10 seconds',
      'Trophies, the Shartzone and weekly hardware',
      'Manager stories and a full screen highlight player',
      'The week in 90 seconds',
      'The official app icon and the opening animation',
    ],
    href: 'https://snffl-niaiddvk9-matt-fe9b.vercel.app',
    external: true,
  },
  {
    name: 'SQUIRT',
    built: 'September 25 to October 11, 2026',
    build: 'a805295',
    line: "The app is SQUIRT: projections on this league's rulebook, the Swami and My Team.",
    highlights: [
      "Projections scored on this league's rulebook",
      'The Swami, as a research bench',
      'The team choice becomes identity, and My Team',
      'The swap button, wired',
      'Trade evaluator and waiver suggestions in the Swami',
    ],
    href: 'https://snffl-ne0zsmzdk-matt-fe9b.vercel.app',
    external: true,
  },
  {
    name: 'Splash',
    built: 'In progress',
    build: 'Not released',
    line: 'The v3 redesign: light, one theme, and every v2 feature kept and improved.',
    highlights: [
      'A new menu: Home, Scores, Standings, Rag, Swami, Feed, More',
      'Squirt says up to six verdicts, yours first',
      'Clips move off ESPN',
    ],
    // At release this becomes the production domain, https://www.squirtnite.live
    href: '/',
    external: false,
  },
];

export default function VersionsPage() {
  return (
    <Shell active="more">
      <PageHead title="Versions" sub="Four names, one league. The old builds still run on live league data." />
      <div className={w.grid}>
        {ERAS.map((era) => (
          <Widget key={era.name} size="m" icon="drop" title={era.name}>
            <dl className={v.facts}>
              <div className={v.fact}>
                <dt>Built</dt>
                <dd>{era.built}</dd>
              </div>
              <div className={v.fact}>
                <dt>Build</dt>
                <dd className={v.sha}>{era.build}</dd>
              </div>
            </dl>
            <p className={v.line}>{era.line}</p>
            <ul className={v.highlights}>
              {era.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <div className={v.foot}>
              {era.external ? (
                <a href={era.href} target="_blank" rel="noopener noreferrer" className={`${home.pillBtn} ${home.pillSmall}`}>
                  Open {era.name}
                </a>
              ) : (
                <Link href={era.href} className={`${home.pillBtn} ${home.pillSmall}`}>
                  Open {era.name}
                </Link>
              )}
            </div>
          </Widget>
        ))}
      </div>
    </Shell>
  );
}
