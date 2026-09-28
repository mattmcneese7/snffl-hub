"""Game environment per team-week, from the Vegas line. Checkpoint 18b.

Implied team total is the market's estimate of how many points a team scores,
split out of the game total by the spread:
  home = (total + spread) / 2,  away = (total - spread) / 2.
Known before kickoff, so it leaks nothing, and it is the single strongest read
on scoring environment a season average cannot see.
"""

from __future__ import annotations
import io
import os
import subprocess
import pandas as pd

CACHE = os.path.join(os.path.dirname(__file__), ".cache")
URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.parquet"


def _load_raw() -> pd.DataFrame:
    path = os.path.join(CACHE, "schedules.parquet")
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        out = subprocess.run(["curl", "-sL", URL], capture_output=True, timeout=120)
        with open(path, "wb") as fh:
            fh.write(out.stdout)
    return pd.read_parquet(path)


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
