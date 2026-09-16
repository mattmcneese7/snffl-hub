'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

/**
 * Sort and filter across the player database, Checkpoint 5c.
 *
 * Every sort key arrives precomputed. lib/stats.ts static imports a 292KB
 * file, so importing it here would ship all of it to every phone that opens
 * this page. The server does the reading, this does the arranging.
 */
export type PlayerRow = {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  headshot: string;
  ownerRosterId: number | null;
  ownerManager: string | null;
  points: number;
  projected: number | null;
  posRank: number | null;
  yards: number;
  touchdowns: number;
  snapPct: number;
};

type Owner = { rosterId: number; manager: string };

const SORTS = {
  points: { label: 'Season Points', digits: 2 },
  projected: { label: 'Projected', digits: 2 },
  posRank: { label: 'Position Rank', digits: 0 },
  yards: { label: 'Total Yards', digits: 0 },
  touchdowns: { label: 'Touchdowns', digits: 0 },
  snapPct: { label: 'Snap Share', digits: 0 },
} as const;

type SortKey = keyof typeof SORTS;

const PAGE = 50;

export default function PlayersBrowser({
  rows,
  owners,
  nflTeams,
  upcomingWeek,
  ownershipComplete,
}: {
  rows: PlayerRow[];
  owners: Owner[];
  nflTeams: string[];
  upcomingWeek: number;
  ownershipComplete: boolean;
}) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('all');
  const [nflTeam, setNflTeam] = useState('all');
  const [owner, setOwner] = useState('all');
  const [sort, setSort] = useState<SortKey>('points');
  const [includeFreeAgents, setIncludeFreeAgents] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const positions = useMemo(
    () => [...new Set(rows.map((row) => row.position).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const out = rows.filter((row) => {
      if (!includeFreeAgents && row.ownerRosterId == null) return false;
      if (position !== 'all' && row.position !== position) return false;
      if (nflTeam !== 'all' && row.nflTeam !== nflTeam) return false;
      if (owner === 'free' && row.ownerRosterId != null) return false;
      if (owner !== 'all' && owner !== 'free' && String(row.ownerRosterId) !== owner) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });

    out.sort((a, b) => {
      // Rank counts upward, so 1 is best. Everything else counts downward.
      if (sort === 'posRank') {
        if (a.posRank == null && b.posRank == null) return 0;
        if (a.posRank == null) return 1;
        if (b.posRank == null) return -1;
        return a.posRank - b.posRank;
      }
      const av = a[sort];
      const bv = b[sort];
      // A missing projection sorts last rather than sorting as a zero.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });

    return out;
  }, [rows, search, position, nflTeam, owner, sort, includeFreeAgents]);

  const shown = filtered.slice(0, limit);
  const spec = SORTS[sort];

  const reset = (apply: () => void) => {
    apply();
    setLimit(PAGE);
  };

  return (
    <div>
      <div className="snffl-browser-controls">
        <div className="snffl-browser-field">
          <label className="snffl-browser-label" htmlFor="snffl-player-search">
            Search
          </label>
          <input
            id="snffl-player-search"
            className="snffl-browser-input"
            type="search"
            value={search}
            placeholder="Player name"
            onChange={(e) => reset(() => setSearch(e.target.value))}
          />
        </div>

        <div className="snffl-browser-selects">
          <div className="snffl-browser-field">
            <label className="snffl-browser-label" htmlFor="snffl-player-sort">
              Sort By
            </label>
            <select
              id="snffl-player-sort"
              className="snffl-browser-select"
              value={sort}
              onChange={(e) => reset(() => setSort(e.target.value as SortKey))}
            >
              {Object.entries(SORTS).map(([key, value]) => (
                <option key={key} value={key}>
                  {key === 'projected' ? `Projected, Week ${upcomingWeek}` : value.label}
                </option>
              ))}
            </select>
          </div>

          <div className="snffl-browser-field">
            <label className="snffl-browser-label" htmlFor="snffl-player-position">
              Position
            </label>
            <select
              id="snffl-player-position"
              className="snffl-browser-select"
              value={position}
              onChange={(e) => reset(() => setPosition(e.target.value))}
            >
              <option value="all">All positions</option>
              {positions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="snffl-browser-field">
            <label className="snffl-browser-label" htmlFor="snffl-player-nfl">
              NFL Team
            </label>
            <select
              id="snffl-player-nfl"
              className="snffl-browser-select"
              value={nflTeam}
              onChange={(e) => reset(() => setNflTeam(e.target.value))}
            >
              <option value="all">All teams</option>
              {nflTeams.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="snffl-browser-field">
            <label className="snffl-browser-label" htmlFor="snffl-player-owner">
              Manager
            </label>
            <select
              id="snffl-player-owner"
              className="snffl-browser-select"
              value={owner}
              onChange={(e) =>
                reset(() => {
                  const next = e.target.value;
                  setOwner(next);
                  // Asking for free agents and hiding them would return nothing.
                  if (next === 'free') setIncludeFreeAgents(true);
                })
              }
            >
              <option value="all">Everyone</option>
              <option value="free">Free agents</option>
              {owners.map((entry) => (
                <option key={entry.rosterId} value={String(entry.rosterId)}>
                  {entry.manager}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="snffl-browser-toggle">
          <input
            type="checkbox"
            checked={includeFreeAgents}
            onChange={(e) => reset(() => setIncludeFreeAgents(e.target.checked))}
          />
          <span>Include free agents</span>
        </label>

        {!ownershipComplete ? (
          <p className="snffl-browser-notice">
            Sleeper did not answer, so ownership is showing starters only. Bench players may
            read as free agents until the next refresh.
          </p>
        ) : null}
      </div>

      <p className="snffl-browser-count">
        Showing {shown.length} of {filtered.length}
      </p>

      <div className="snffl-card">
        {shown.length === 0 ? (
          <div className="snffl-placeholder">
            <span className="snffl-placeholder-label">Nobody matches</span>
            <span className="snffl-placeholder-note">Loosen a filter and try again.</span>
          </div>
        ) : (
          shown.map((row) => {
            const value = row[sort];
            return (
              <Link className="snffl-roster-row" href={`/players/${row.id}`} key={row.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="snffl-lineup-headshot" src={row.headshot} alt="" loading="lazy" />
                <span>
                  <span className="snffl-lineup-name">{row.name}</span>
                  <span className="snffl-lineup-meta">
                    {row.position}
                    {row.nflTeam ? ` · ${row.nflTeam}` : ''}
                    {row.ownerManager ? ` · ${row.ownerManager}` : ' · free agent'}
                  </span>
                </span>
                <span className="snffl-roster-points snffl-numeric">
                  {value == null ? 'n/a' : Number(value).toFixed(spec.digits)}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {shown.length < filtered.length ? (
        <button
          className="snffl-browser-more"
          type="button"
          onClick={() => setLimit(limit + PAGE)}
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}
