'use client';

import { useRouter } from 'next/navigation';

/**
 * A team choice that is really a link.
 *
 * The server works out where every option leads, so the URL stays the whole
 * state of the view and a pasted link opens on exactly what was on screen.
 * This only turns a change of selection into the navigation.
 */
export default function SwamiSelect({
  id,
  label,
  value,
  options,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <label className="snffl-swami-select" htmlFor={id}>
      <span className="snffl-label">{label}</span>
      <select
        id={id}
        className="snffl-team-picker"
        value={value}
        onChange={(event) => {
          const next = options.find((o) => o.value === event.target.value);
          if (next) router.push(next.href, { scroll: false });
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
