/**
 * The beats of a week's story, as plain data the server builds and the
 * viewer draws. Every number in here came from Sleeper through lib/league or
 * from the week's story in lib/week-story; nothing is filled in.
 */

export type Person = {
  rosterId: number;
  /** First name, from config/managers, else the Sleeper handle. */
  first: string;
  team: string;
  avatar: string | null;
};

export type Player = {
  id: string;
  name: string;
  headshot: string;
  position: string;
  nflTeam: string | null;
  points: number;
};

export type Side = { who: Person; points: number };

export type TableRow = { who: Person; seed: number; wins: number; losses: number; points: number };

export type Beat =
  | {
      kind: 'cover';
      games: number;
      total: number;
      high: number;
      highBy: Person | null;
      image: string | null;
    }
  | {
      kind: 'motw';
      who: Person;
      value: number;
      image: string | null;
      star: Player | null;
      opponent: Person | null;
      margin: number | null;
      won: boolean;
    }
  | { kind: 'topPlayer'; player: Player; who: Person; won: boolean }
  | {
      kind: 'shart';
      who: Person;
      value: number;
      image: string | null;
      star: Player | null;
      opponent: Person | null;
      margin: number | null;
    }
  | { kind: 'close'; winner: Side; loser: Side; margin: number }
  | { kind: 'blowout'; winner: Side; loser: Side; margin: number }
  | {
      kind: 'bench';
      who: Person;
      benched: Player;
      started: Player & { slot: string };
      swing: number;
      result: 'flips' | 'lost' | 'won';
      margin: number;
    }
  | {
      kind: 'play';
      headline: string;
      image: string | null;
      /** A playable file URL, or null when the source is not a file (a YouTube id). */
      video: string | null;
      points: number | null;
      first: string | null;
    }
  | { kind: 'movers'; movers: { who: Person; from: number; to: number }[] }
  | { kind: 'line'; seeds: number; inside: TableRow[]; outside: TableRow[] }
  | { kind: 'rag'; category: string; headline: string; deck: string };

/** The images a beat shows, for preloading the next one. */
export function imagesOf(beat: Beat | undefined): string[] {
  if (!beat) return [];
  const out: (string | null | undefined)[] = [];
  switch (beat.kind) {
    case 'cover':
      out.push(beat.image);
      break;
    case 'motw':
    case 'shart':
      out.push(beat.image, beat.star?.headshot, beat.who.avatar);
      break;
    case 'topPlayer':
      out.push(beat.player.headshot, beat.who.avatar);
      break;
    case 'close':
    case 'blowout':
      out.push(beat.winner.who.avatar, beat.loser.who.avatar);
      break;
    case 'bench':
      out.push(beat.benched.headshot, beat.started.headshot);
      break;
    case 'play':
      out.push(beat.image);
      break;
    case 'movers':
      out.push(...beat.movers.map((m) => m.who.avatar));
      break;
    case 'line':
      out.push(...[...beat.inside, ...beat.outside].map((r) => r.who.avatar));
      break;
    case 'rag':
      break;
  }
  return out.filter((u): u is string => Boolean(u));
}
