import type { StoryArt } from '@/lib/story-images';

/**
 * Lead art for a Rag story: a real highlight still, or a player card drawn
 * from the week's data when there is no clip. Either sits over the placeholder
 * gradient, so an image that fails to load degrades to that and not a gap.
 */
export default function StoryArtView({ art, size = 'md' }: { art?: StoryArt; size?: 'sm' | 'md' | 'lg' }) {
  if (!art) return null;
  if (art.kind === 'photo') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="snffl-story-art-photo" src={art.src} alt="" loading="lazy" />;
  }
  return (
    <span
      className={`snffl-story-art-player snffl-story-art-${size}`}
      style={{ ['--team' as string]: art.color }}
    >
      {art.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="snffl-story-art-logo" src={art.logo} alt="" loading="lazy" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="snffl-story-art-cutout" src={art.cutout} alt="" loading="lazy" />
      {size !== 'sm' ? (
        <span className="snffl-story-art-caption">
          <strong>{art.name}</strong>
          <span>{art.points.toFixed(2)} pts</span>
        </span>
      ) : null}
    </span>
  );
}
