import { teamByRoster } from '@/lib/league';

/**
 * Manager avatar with the brief's fallback: initials on the manager's color.
 * Rendered server side, so the fallback is chosen from whether Sleeper gave us
 * an avatar at all rather than waiting for an onerror in the browser.
 */
export default function TeamAvatar({
  rosterId,
  className,
}: {
  rosterId: number;
  className: string;
}) {
  const team = teamByRoster(rosterId);
  if (!team) return <span className={`${className} snffl-avatar-fallback`}>??</span>;

  const initials = (team.teamName || team.manager).slice(0, 2).toUpperCase();

  if (!team.avatarUrl) {
    return (
      <span
        className={`${className} snffl-avatar-fallback`}
        style={{ background: team.colors?.primary }}
        aria-label={team.manager}
      >
        {initials}
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={team.avatarUrl} alt="" loading="lazy" />;
}
