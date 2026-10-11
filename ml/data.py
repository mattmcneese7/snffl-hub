"""Historical weekly data from Sleeper, scored on this league's rulebook.

Checkpoint 18b. Retrained on Sleeper instead of nflverse, and that switch is
the whole point: Sleeper's stats are keyed by the same player ids the app uses,
serve the current week the same way they serve 2017, and score through the same
component keys as lib/scoring.ts. So training and serving are the same source,
the same ids, and the same scoring path, which removes three ways the model
could have quietly drifted from what the app shows.

Offense only: QB, RB, WR, TE. Kickers and defences score on categories handled
by the deterministic engine from Checkpoint 14.
"""

from __future__ import annotations
import json
import os
import subprocess
import sys
import time
import pandas as pd

CACHE = os.path.join(os.path.dirname(__file__), ".cache", "sleeper")
POSITIONS = ["QB", "RB", "WR", "TE"]

# Sleeper and the nflverse schedule disagree on a handful of team codes. Every
# code is normalised to the schedule's spelling once, on load, so DvP, target
# shares and the Vegas join all live in one code space and nothing has to be
# translated back later. Covers the relocations in range too (Raiders, Chargers,
# Rams, Commanders).
TEAM_NORM = {"LAR": "LA", "JAC": "JAX", "OAK": "LV", "SD": "LAC", "STL": "LA", "WSH": "WAS"}


def _norm(code):
    return TEAM_NORM.get(code, code)

# This league's offensive scoring, in Sleeper's own stat keys, taken from
# data/league.json. The same numbers lib/scoring.ts applies, so a point
# computed here equals a point shown in the app.
SCORING = {
    "pass_yd": 0.04, "pass_td": 4.0, "pass_int": -2.0, "pass_2pt": 2.0,
    "rush_yd": 0.1, "rush_td": 6.0, "rush_2pt": 2.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0, "rec_2pt": 2.0,
    "fum_lost": -2.0,
}


# Sleeper corrects a week's stats for a few days after it is played (a catch
# overturned, a fumble reassigned), so the current season's most recent
# completed weeks are fetched again once their copy is older than MAX_AGE_HOURS.
# Older weeks and past seasons are settled and stay cached for good. The nightly
# job always starts from a cache restored from an earlier run, so without this a
# correction would never arrive.
RECENT_WEEKS = 2
MAX_AGE_HOURS = 6


def _download(url: str) -> list[dict] | None:
    """One page from Sleeper, or None if the request or the body is bad.

    curl rather than urllib: this Mac's Python has no CA bundle, and curl is
    present on both a laptop and an Ubuntu runner, so one path works in both.
    -g keeps curl from reading the brackets in position[] as a glob.
    """
    out = subprocess.run(
        ["curl", "-fsSLg", "--retry", "3", url], capture_output=True, text=True, timeout=120
    )
    if out.returncode != 0:
        return None
    try:
        rows = json.loads(out.stdout)
    except ValueError:
        return None
    if not isinstance(rows, list):
        return None
    return rows


def _fetch(season: int, week: int, position: str, live_week: int | None = None) -> list[dict]:
    """One (season, week, position) page, cached as raw JSON on disk.

    live_week is the week being projected when `season` is the current one. A
    page from the RECENT_WEEKS completed weeks before it, or an empty page from
    any completed week of this season, is fetched again once its copy is older
    than MAX_AGE_HOURS. An empty page is real for a week no team played (week
    18 of a 17 week season) but never for a completed week of the current one.
    A failed or malformed response is never cached.
    """
    path = os.path.join(CACHE, f"{season}-{week}-{position}.json")
    cached = None
    if os.path.exists(path):
        with open(path) as fh:
            cached = json.load(fh)
        recheck = live_week is not None and (week >= live_week - RECENT_WEEKS or not cached)
        old = time.time() - os.path.getmtime(path) >= MAX_AGE_HOURS * 3600
        if not (recheck and old):
            return cached
    url = (
        f"https://api.sleeper.com/stats/nfl/{season}/{week}"
        f"?season_type=regular&position[]={position}"
    )
    rows = _download(url)
    if rows is None:
        if cached is not None:
            print(f"  stats refresh failed for {season} week {week} {position}, "
                  "using the cached copy", file=sys.stderr)
            return cached
        raise SystemExit(f"could not download {season} week {week} {position} stats from Sleeper")
    os.makedirs(CACHE, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(rows, fh)
    os.replace(tmp, path)
    return rows


def league_points(stats: dict) -> float:
    return round(sum(stats.get(k, 0) * w for k, w in SCORING.items()), 2)


def load(years: list[int], weeks: range = range(1, 19), live_week: int | None = None) -> pd.DataFrame:
    """Weekly offensive lines for the given seasons, one row per player-week.

    Pass live_week, the week being projected, when loading the current season,
    so its recent pages are kept up to date with Sleeper's stat corrections.
    """
    records = []
    for year in years:
        for week in weeks:
            for pos in POSITIONS:
                for row in _fetch(year, week, pos, live_week):
                    stats = row.get("stats") or {}
                    pid = row.get("player_id")
                    team = row.get("team")
                    opp = row.get("opponent")
                    # No team or opponent means he did not play a countable
                    # game that week; nothing to learn from and nothing to
                    # attribute to a defence.
                    if not pid or not team or not opp:
                        continue
                    rec = {
                        "player_id": str(pid), "season": year, "week": week,
                        "position": pos, "team": _norm(team), "opponent": _norm(opp),
                        "league_points": league_points(stats),
                    }
                    for k in ("pass_att", "rec_tgt", "rush_att", "rec", "rec_air_yd", "off_snp", "tm_off_snp"):
                        rec[k] = stats.get(k, 0.0)
                    # Real involvement: a pass thrown, a carry, or a target. The
                    # same line nflverse's weekly file implicitly keeps, and the
                    # honest population for a fantasy model. A body on the field
                    # who touched nothing is noise, not a data point.
                    rec["involved"] = int(
                        (rec["pass_att"] or 0) > 0 or (rec["rush_att"] or 0) > 0 or (rec["rec_tgt"] or 0) > 0
                    )
                    records.append(rec)
    return pd.DataFrame.from_records(records)


if __name__ == "__main__":
    df = load([2023])
    print(f"rows {len(df)}, weeks {sorted(df['week'].unique())}")
    for pos in POSITIONS:
        sub = df[df["position"] == pos]
        print(f"  {pos}: {len(sub)} rows, mean {sub['league_points'].mean():.2f} pts")
