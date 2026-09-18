// Template fallback, Brief Section 3 and Section 9.
//
// Used when validation fails twice or the Claude credit is spent. Templates
// are deliberately plain: the facts are real, the jokes are not attempted.
// A templated article is marked so the section can say so.

import { ARTICLE_SPECS, type ArticleId } from '../config/style-guide.ts';
import type { WeekFacts } from './fact-packets.ts';
import type { Candidate } from './validate.ts';

const ordinal = (n: number) => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
};

export function templateFor(id: ArticleId, facts: WeekFacts): Candidate {
  const spec = ARTICLE_SPECS[id];
  const week = `Week ${facts.week}`;

  switch (id) {
    case 'shart':
      return {
        headline: `${facts.shart.manager} Takes the Shart in ${week}`,
        deck: `Lowest score of the week, ${facts.shart.points.toFixed(2)} points.`,
        body: [
          `${facts.shart.team} scored ${facts.shart.points.toFixed(2)} in ${week}, the lowest total in the league.`,
          facts.shart.beatenBy
            ? `${facts.shart.beatenBy} took the win.`
            : `Nobody needed to do much to beat it.`,
          `That is a chug. The rules are the rules.`,
        ],
        signOff: 'Chug, bitch.',
      };

    case 'hardware':
      return {
        headline: `The ${week} Hardware`,
        deck: `${facts.trophies.length} trophies handed out.`,
        body: facts.trophies.length
          ? facts.trophies.map((t) => `${t.award}: ${t.firstName}, ${t.team}, ${t.detail}.`)
          : [`No hardware this week. Every game has to be final first.`],
      };

    case 'manager':
      return {
        headline: `${facts.managerOfWeek.manager} Is Manager of the Week`,
        deck: `${facts.managerOfWeek.points.toFixed(2)} points, the best in the league.`,
        body: [
          `${facts.managerOfWeek.team} put up ${facts.managerOfWeek.points.toFixed(2)} points in ${week}, the highest total of the week.`,
        ],
      };

    case 'game': {
      const g = facts.gameOfWeek;
      return {
        headline: `${g.winner} Edges ${g.loser} in the Game of the Week`,
        deck: `Decided by ${g.margin.toFixed(2)} points.`,
        body: [
          `${g.away.team} scored ${g.away.points.toFixed(2)} and ${g.home.team} scored ${g.home.points.toFixed(2)}.`,
          `${g.winner} took it by ${g.margin.toFixed(2)}.`,
        ],
      };
    }

    case 'around':
      return {
        headline: `Around the League in ${week}`,
        deck: `Every result from ${week}.`,
        body: facts.games.map(
          (g) =>
            `${g.away.team} ${g.away.points.toFixed(2)}, ${g.home.team} ${g.home.points.toFixed(2)}. ${g.winner} wins by ${g.margin.toFixed(2)}.`
        ),
      };

    case 'performances':
      return {
        headline: `Big Performances From ${week}`,
        deck: `The top individual scores.`,
        body: facts.topPerformers.map(
          (p) => `${p.name}, ${p.position}, scored ${p.points.toFixed(2)} for ${p.manager}.`
        ),
      };

    case 'power':
      return {
        headline: `Power Rankings After ${week}`,
        deck: `All ${facts.teamCount} teams.`,
        body: facts.powerRankings.map(
          (r) => `${ordinal(r.rank)}. ${r.team}, ${r.manager}, ${r.record}.`
        ),
      };

    case 'waiver':
      return {
        headline: `Waiver Wire After ${week}`,
        deck: `Moves worth noting.`,
        body: [`Waiver activity for ${week} is listed in the Trade Tracker and Players pages.`],
      };

    case 'trades':
      return {
        headline: `Trade Desk After ${week}`,
        deck: facts.trades.length ? `${facts.trades.length} trades so far.` : `No trades yet.`,
        body: facts.trades.length
          ? facts.trades.map(
              (t) =>
                `Week ${t.week}: ` +
                t.sides
                  .map((s) => `${s.team} gets ${s.gets.length ? s.gets.join(', ') : 'nothing'}`)
                  .join('. ')
            )
          : [`Nobody has made a trade yet.`],
      };

    case 'preview':
      return {
        headline: `Next Week Preview`,
        deck: `What is coming in Week ${facts.week + 1}.`,
        body: facts.nextWeek.length
          ? facts.nextWeek.map((m) => `${m.away} plays ${m.home}.`)
          : [`The schedule for Week ${facts.week + 1} is not posted yet.`],
      };

    case 'corrections':
      return {
        headline: `Corrections and Retractions`,
        deck: `Nothing to correct.`,
        body: [`No stat corrections changed a published result this week.`],
      };

    default:
      return {
        headline: spec.title,
        deck: '',
        body: [`No content available for ${week}.`],
      };
  }
}
