import Link from 'next/link';
import { Fragment } from 'react';

/**
 * A manager's name or team name, always a way through to his manager page.
 * Pure and import free apart from next/link, so client components can use it.
 */
export default function ManagerLink({
  rosterId,
  children,
  className = '',
}: {
  rosterId: number | string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  if (rosterId == null || rosterId === '') return <span className={className}>{children}</span>;
  return (
    <Link className={`snffl-manager-link ${className}`.trim()} href={`/managers/${rosterId}`}>
      {children}
    </Link>
  );
}

export type NameEntry = { name: string; rosterId: number };

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Prose with every manager and team name turned into a link to that manager.
 * Longest names first, so "Chase Browns with Downs" wins over anything inside
 * it; whole words and exact capitalisation only, so "Jack" never matches
 * inside "Jackson" and "ben" in a sentence is left alone.
 */
export function LinkedText({ text, names }: { text: string; names: NameEntry[] }) {
  const usable = names.filter((entry) => entry.name && entry.name.length > 2);
  if (!usable.length) return <>{text}</>;
  const sorted = [...usable].sort((a, b) => b.name.length - a.name.length);
  const byName = new Map(sorted.map((entry) => [entry.name, entry.rosterId]));
  const pattern = new RegExp(`(?<![\\w'])(${sorted.map((e) => escape(e.name)).join('|')})(?![\\w])`, 'g');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) =>
        byName.has(part) ? (
          <ManagerLink key={index} rosterId={byName.get(part)!}>
            {part}
          </ManagerLink>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}
