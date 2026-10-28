import type { GameExtras, NflGame } from '@/lib/gameday';

/**
 * A game's venue chips, as Step 2 set them for previews: the stadium and
 * city, the roof, the surface, and the forecast before kickoff. Shared by the
 * NFL game page and the matchup's Next Game, so they always match.
 */
export function venueChips(game: NflGame, extras: GameExtras | null): string[] {
  const v = extras?.venue ?? null;
  const w = game.state === 'pre' && !v?.indoor ? (extras?.weather ?? null) : null;
  const forecast = w
    ? [w.temperature != null ? `${w.temperature}°` : null, w.windSpeed != null ? `wind ${w.windSpeed} mph${w.windDirection ? ` ${w.windDirection}` : ''}` : null, w.precipitation ? `${w.precipitation}% rain` : null].filter(Boolean).join(', ')
    : '';
  return [
    v ? [v.name, v.city].filter(Boolean).join(', ') : game.venue,
    v?.indoor ? 'Indoors' : v ? 'Outdoors' : null,
    v?.grass === true ? 'Grass' : v?.grass === false ? 'Turf' : null,
    forecast || null,
  ].filter(Boolean) as string[];
}
