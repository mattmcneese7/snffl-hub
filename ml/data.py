"""Historical NFL weekly data, scored on this league's rulebook.

Checkpoint 18a. The training spine for the model.

Two rules govern this file, both in service of the one constraint that matters:
not a single invented number.

  1. The target is computed from raw stat components, never taken from
     nflverse's `fantasy_points_ppr`. That field is standard PPR; this league
     charges -2 for an interception where standard charges -1, so trusting it
     would train the model on the wrong target for quarterbacks. Same reasoning
     as Checkpoint 12, in Python this time.

  2. Nothing here is an estimate. Every column is a thing that happened in a
     game, pulled from nflverse's published weekly release.

Offense only: QB, RB, WR, TE. Kickers and defenses score on categories this
file does not carry (field goal distance, points and yards allowed), and their
projections stay on the deterministic engine from Checkpoint 14 rather than
being half-modelled here. A model that quietly did K and DEF on missing inputs
would be exactly the fabrication we are refusing.
"""

from __future__ import annotations
import io
import os
import urllib.request
import pandas as pd

REL = "https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_{year}.parquet"
CACHE = os.path.join(os.path.dirname(__file__), ".cache")
POSITIONS = ["QB", "RB", "WR", "TE"]


def _read_season(year: int) -> pd.DataFrame:
    """A season's parquet, from the local cache or the nflverse release.

    The cache is what makes a backtest repeatable without hammering the
    release, and it is also the reason this runs on a Mac whose Python has no
    CA bundle: the files are fetched once with the system's own downloader and
    read from disk thereafter. In CI the cache is cold and urllib fetches
    directly, which works on Linux.
    """
    path = os.path.join(CACHE, f"player_stats_{year}.parquet")
    if os.path.exists(path):
        return pd.read_parquet(path)
    with urllib.request.urlopen(REL.format(year=year)) as resp:
        raw = resp.read()
    os.makedirs(CACHE, exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(raw)
    return pd.read_parquet(io.BytesIO(raw))

# This league's offensive scoring, from data/league.json. Only the rules that
# apply to offensive stat lines are here; the rest of the 148 settings are for
# kickers and defenses, which this file does not touch.
SCORING = {
    "passing_yards": 0.04,
    "passing_tds": 4.0,
    "interceptions": -2.0,          # the league's rule, not standard -1
    "passing_2pt_conversions": 2.0,
    "rushing_yards": 0.1,
    "rushing_tds": 6.0,
    "rushing_2pt_conversions": 2.0,
    "receptions": 1.0,              # full PPR
    "receiving_yards": 0.1,
    "receiving_tds": 6.0,
    "receiving_2pt_conversions": 2.0,
    # Every flavour of lost fumble costs the same here.
    "sack_fumbles_lost": -2.0,
    "rushing_fumbles_lost": -2.0,
    "receiving_fumbles_lost": -2.0,
}


def league_points(df: pd.DataFrame) -> pd.Series:
    """Fantasy points under this league's rules, from the components."""
    total = pd.Series(0.0, index=df.index)
    for col, weight in SCORING.items():
        if col in df.columns:
            total = total + df[col].fillna(0) * weight
    return total.round(2)


def load(years: list[int]) -> pd.DataFrame:
    """Weekly offensive lines for the given seasons, regular season only."""
    frames = [_read_season(year) for year in years]
    df = pd.concat(frames, ignore_index=True)
    df = df[df["season_type"] == "REG"].copy()
    df = df[df["position"].isin(POSITIONS)].copy()
    df["league_points"] = league_points(df)
    return df


if __name__ == "__main__":
    df = load([2024])
    print(f"rows {len(df)}, seasons {sorted(df['season'].unique())}")
    # Sanity: our league points should track standard PPR closely but sit a
    # touch lower for QBs, who throw interceptions this league taxes double.
    for pos in POSITIONS:
        sub = df[df["position"] == pos]
        diff = (sub["league_points"] - sub["fantasy_points_ppr"]).mean()
        print(f"  {pos}: mean league-vs-standard {diff:+.2f}  (n={len(sub)})")


def load_schedule() -> pd.DataFrame:
    """Per team-week game environment: implied points total and home flag.

    From the closing Vegas line, which is the market's honest estimate of the
    scoring environment and is known before kickoff, so it leaks nothing. The
    implied team total splits the game total by the spread:
    home = (total + spread) / 2, away = (total - spread) / 2.
    """
    path = os.path.join(CACHE, "schedules.parquet")
    sched = pd.read_parquet(path) if os.path.exists(path) else None
    if sched is None:
        with urllib.request.urlopen(
            "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.parquet"
        ) as resp:
            raw = resp.read()
        os.makedirs(CACHE, exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(raw)
        sched = pd.read_parquet(io.BytesIO(raw))

    sched = sched.dropna(subset=["total_line", "spread_line"])
    home = pd.DataFrame({
        "season": sched["season"], "week": sched["week"], "team": sched["home_team"],
        "f_impl_total": (sched["total_line"] + sched["spread_line"]) / 2, "f_home": 1,
    })
    away = pd.DataFrame({
        "season": sched["season"], "week": sched["week"], "team": sched["away_team"],
        "f_impl_total": (sched["total_line"] - sched["spread_line"]) / 2, "f_home": 0,
    })
    return pd.concat([home, away], ignore_index=True)
