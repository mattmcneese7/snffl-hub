import type { Metadata } from 'next';
import { playerOf, scoredWeek } from '@/lib/league';
import { readWeek } from '../../lib/nfl-clips';

/**
 * NFL clips from YouTube, as a bench page.
 *
 * Plain on purpose: this exists to check what the data layer returns for the
 * current week, not to design anything. The first clip plays inline so the
 * embed can be checked on a phone; the rest are stills and titles.
 *
 * A player marked "rostered" is on a team in this league that week.
 */
export const metadata: Metadata = {
  title: { absolute: 'NFL clips' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const page = {
  background: '#ffffff',
  color: '#111111',
  minHeight: '100vh',
  padding: '24px 16px 48px',
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 720,
  margin: '0 auto',
} as const;
const muted = { color: '#555555', fontSize: 13 } as const;

export default async function ClipsBench() {
  const week = await scoredWeek();
  const { clips, calls, complete, rostered } = await readWeek(week);
  const first = clips[0];

  return (
    <main style={page}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Week {week} NFL clips</h1>
      <p style={{ ...muted, margin: '0 0 20px' }}>
        {clips.length} clips from {calls} YouTube {calls === 1 ? 'call' : 'calls'}.{' '}
        {complete ? 'Reached the start of the week.' : 'Did not reach the start of the week, so older clips are missing.'}
      </p>

      {first ? (
        <div style={{ position: 'relative', paddingTop: '56.25%', marginBottom: 24, background: '#000000' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${first.videoId}?playsinline=1&rel=0`}
            title={first.title}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      ) : (
        <p>No clips came back. Either the key is missing, the quota is spent, or nothing is posted yet.</p>
      )}

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {clips.map((clip) => (
          <li
            key={clip.videoId}
            style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: '1px solid #dddddd' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clip.still}
              alt=""
              loading="lazy"
              width={160}
              height={90}
              style={{ width: 160, height: 90, objectFit: 'cover', flexShrink: 0, borderRadius: 6 }}
            />
            <div style={{ minWidth: 0 }}>
              <a
                href={`https://www.youtube.com/watch?v=${clip.videoId}`}
                style={{ color: '#0b4fa8', fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}
              >
                {clip.title}
              </a>
              <p style={{ ...muted, margin: '4px 0 0' }}>
                {clip.playerIds.length
                  ? clip.playerIds
                      .map((id) => `${playerOf(id).name}${rostered.has(id) ? ' (rostered)' : ''}`)
                      .join(', ')
                  : 'No player matched'}
                {clip.nflTeams.length ? `. Teams: ${clip.nflTeams.join(', ')}` : ''}
              </p>
              <p style={{ ...muted, margin: '2px 0 0' }}>
                {new Date(clip.publishedAt).toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                ET
              </p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
