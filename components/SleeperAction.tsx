import { ACTION_LABELS, sleeperLink, type SleeperAction } from '@/lib/sleeper-links';

/**
 * A button into Sleeper, on the screen where the thing can actually be done.
 * The mark is Sleeper's own, since the button leaves the site for theirs.
 */
export default function SleeperActionButton({
  action,
  label,
  compact = false,
}: {
  action: SleeperAction;
  /** Overrides the default label, "Set Lineup" and so on. */
  label?: string;
  compact?: boolean;
}) {
  return (
    <a
      className={`snffl-sleeper-action${compact ? ' snffl-sleeper-action-compact' : ''}`}
      href={sleeperLink(action)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/sources/sleeper.png" alt="" />
      <span>{label ?? ACTION_LABELS[action]}</span>
      <span className="snffl-sleeper-action-arrow" aria-hidden>
        &#8599;
      </span>
    </a>
  );
}

/** A row of Sleeper buttons. */
export function SleeperActions({ actions }: { actions: SleeperAction[] }) {
  return (
    <div className="snffl-sleeper-actions">
      {actions.map((action) => (
        <SleeperActionButton key={action} action={action} />
      ))}
    </div>
  );
}
