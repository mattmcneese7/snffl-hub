// Which chug film exists for a week.
//
// The videos are committed to public/chug as week-N.mp4 rather than fetched:
// they are a couple of megabytes each, there are at most eighteen a season,
// and a file in the repo cannot fail to load for a reason nobody can debug on
// a Sunday. Converted to H.264 and AAC on the way in, because a phone camera
// writes HEVC in a .MOV and Chrome will not play it.

import fs from 'node:fs';
import path from 'node:path';

/** The newest week that has a chug film, or null. */
export function latestChug(throughWeek: number): { week: number; src: string } | null {
  for (let week = throughWeek; week >= 1; week--) {
    const src = `/chug/week-${week}.mp4`;
    try {
      if (fs.existsSync(path.join('public', 'chug', `week-${week}.mp4`))) return { week, src };
    } catch {
      return null;
    }
  }
  return null;
}
