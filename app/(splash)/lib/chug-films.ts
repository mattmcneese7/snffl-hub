// Every chug film on file, newest first. The same files lib/chug-video.ts
// reads (public/chug/week-N.mp4, H.264 and AAC so every phone plays them),
// listed whole so the Chug Meter can keep an archive of past weeks.

import fs from 'node:fs';
import path from 'node:path';

export type ChugFilm = { week: number; src: string };

export function chugFilms(throughWeek: number): ChugFilm[] {
  const films: ChugFilm[] = [];
  for (let week = throughWeek; week >= 1; week--) {
    try {
      if (fs.existsSync(path.join('public', 'chug', `week-${week}.mp4`))) films.push({ week, src: `/chug/week-${week}.mp4` });
    } catch {
      break;
    }
  }
  return films;
}
