"""Game environment per team-week, from the Vegas line. Checkpoint 18b.

Implied team total is the market's estimate of how many points a team scores,
split out of the game total by the spread:
  home = (total + spread) / 2,  away = (total - spread) / 2.
Known before kickoff, so it leaks nothing, and it is the single strongest read
on scoring environment a season average cannot see.
"""

from __future__ import annotations
import functools
import io
import os
import subprocess
import sys
import time
import pandas as pd

CACHE = os.path.join(os.path.dirname(__file__), ".cache")
PATH = os.path.join(CACHE, "schedules.parquet")
URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.parquet"

# Unlike a finished week of stats, the schedule file changes all season: nflverse
# only posts a week's lines once the books open, about a week out, and they move
# until kickoff. A copy older than this is fetched again. The nightly job always
# runs on a copy restored from an earlier run, so without this it would keep the
# first download forever and never see a new week's lines.
MAX_AGE_HOURS = 6


def _download() -> bytes | None:
    out = subprocess.run(["curl", "-fsSL", URL], capture_output=True, timeout=120)
    if out.returncode != 0 or not out.stdout:
        return None
    try:
        pd.read_parquet(io.BytesIO(out.stdout))
    except Exception:
        return None
    return out.stdout


@functools.cache
def _load_raw() -> pd.DataFrame:
    fresh = os.path.exists(PATH) and time.time() - os.path.getmtime(PATH) < MAX_AGE_HOURS * 3600
    if not fresh:
        body = _download()
        if body is not None:
            os.makedirs(CACHE, exist_ok=True)
            tmp = PATH + ".tmp"
            with open(tmp, "wb") as fh:
                fh.write(body)
            os.replace(tmp, PATH)
        elif os.path.exists(PATH):
            # A stale copy is still right about every finished week. Whether it
            # covers the week being projected is checked where that matters.
            print("  schedule download failed, using the cached copy", file=sys.stderr)
        else:
            raise SystemExit(f"could not download the schedule from {URL}")
    return pd.read_parquet(PATH)


def week_games(season: int, week: int) -> pd.DataFrame:
    """Every team with a game in one week, line or not, one row per team."""
    sched = _load_raw()
    g = sched[(sched["season"] == season) & (sched["week"] == week)]
    has_line = g["total_line"].notna() & g["spread_line"].notna()
    from data import _norm
    return pd.concat([
        pd.DataFrame({"team": g["home_team"].map(_norm), "has_line": has_line}),
        pd.DataFrame({"team": g["away_team"].map(_norm), "has_line": has_line}),
    ], ignore_index=True)


def team_week_env() -> pd.DataFrame:
    from data import _norm  # one normalisation, shared, so both sides agree
    sched = _load_raw().dropna(subset=["total_line", "spread_line"])
    home = pd.DataFrame({
        "season": sched["season"], "week": sched["week"],
        "team": sched["home_team"].map(_norm), "opponent": sched["away_team"].map(_norm),
        "f_impl_total": (sched["total_line"] + sched["spread_line"]) / 2, "f_home": 1,
    })
    away = pd.DataFrame({
        "season": sched["season"], "week": sched["week"],
        "team": sched["away_team"].map(_norm), "opponent": sched["home_team"].map(_norm),
        "f_impl_total": (sched["total_line"] - sched["spread_line"]) / 2, "f_home": 0,
    })
    return pd.concat([home, away], ignore_index=True)
