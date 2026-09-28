"""Leakage-safe features for the weekly fantasy model. Checkpoint 18a.

The one rule that makes a backtest honest: every feature describing week W is
built only from weeks before W. A model that can see the game it is predicting
will report a fabulous error and predict nothing in the real world, which for
this app is the same crime as inventing a number. So every rolling value is
shifted back a week before it is used, and the opponent's defensive strength is
computed from prior weeks alone.
"""

from __future__ import annotations
import pandas as pd

# Games of prior evidence a defence's own rate is weighted against the league
# average, the same shrinkage the TypeScript spine uses and for the same
# reason: three weeks of points allowed is mostly noise.
DVP_SHRINK = 4


def _rolling_prior(g: pd.Series, window: int) -> pd.Series:
    """Mean of up to `window` games strictly before each row."""
    return g.shift(1).rolling(window, min_periods=1).mean()


def build(df: pd.DataFrame) -> pd.DataFrame:
    """Return df with feature columns and the target, rows in play order."""
    df = df.sort_values(["player_id", "season", "week"]).copy()
    grp = df.groupby(["player_id", "season"], sort=False)

    # What he has been doing lately, and all season. Both strictly prior.
    df["f_l3_points"] = grp["league_points"].transform(lambda s: _rolling_prior(s, 3))
    df["f_std_points"] = grp["league_points"].transform(lambda s: s.shift(1).expanding().mean())
    df["f_last_points"] = grp["league_points"].transform(lambda s: s.shift(1))

    # Usage, which is what separates a role from a hot streak.
    for col, name in [
        ("targets", "f_l3_targets"),
        ("carries", "f_l3_carries"),
        ("receptions", "f_l3_rec"),
        ("target_share", "f_l3_tgtshare"),
        ("air_yards_share", "f_l3_ayshare"),
    ]:
        df[name] = grp[col].transform(lambda s: _rolling_prior(s, 3))

    # How much of a sample we have on him this season.
    df["f_games"] = grp.cumcount()

    df = _opponent_dvp(df)

    # The scoring environment his game is expected to be, from the Vegas line.
    from data import load_schedule
    sched = load_schedule().rename(columns={"team": "recent_team"})
    df = df.merge(sched, on=["season", "week", "recent_team"], how="left")

    # The model reads positions as numbers; a plain code is enough for trees.
    df["f_pos"] = df["position"].map({"QB": 0, "RB": 1, "WR": 2, "TE": 3}).astype("int64")

    return df


def _opponent_dvp(df: pd.DataFrame) -> pd.DataFrame:
    """Points this week's opponent had allowed to this position, prior weeks only."""
    # Points each defence gave up to each position, per game.
    allowed = (
        df.groupby(["season", "opponent_team", "position", "week"])["league_points"]
        .sum()
        .reset_index()
        .rename(columns={"league_points": "allowed", "opponent_team": "defense"})
        .sort_values(["season", "defense", "position", "week"])
    )

    # Prior-weeks-only mean, and the league's per-position mean to shrink toward.
    grp = allowed.groupby(["season", "defense", "position"], sort=False)["allowed"]
    allowed["prior_mean"] = grp.transform(lambda s: s.shift(1).expanding().mean())
    allowed["prior_n"] = grp.transform(lambda s: s.shift(1).expanding().count())

    pos_mean = (
        allowed.groupby(["season", "position", "week"])["allowed"]
        .mean()
        .groupby(level=[0, 1])
        .transform(lambda s: s.shift(1).expanding().mean())
        .rename("pos_mean")
        .reset_index()
    )
    allowed = allowed.merge(pos_mean, on=["season", "position", "week"], how="left")

    n = allowed["prior_n"].fillna(0)
    shrunk = (n * allowed["prior_mean"].fillna(allowed["pos_mean"]) + DVP_SHRINK * allowed["pos_mean"]) / (
        n + DVP_SHRINK
    )
    allowed["f_opp_dvp"] = shrunk.fillna(allowed["pos_mean"])

    # Join back onto each player-week by the defence he faces this week.
    key = allowed[["season", "defense", "position", "week", "f_opp_dvp"]].rename(
        columns={"defense": "opponent_team"}
    )
    return df.merge(key, on=["season", "opponent_team", "position", "week"], how="left")


FEATURES = [
    "f_l3_points", "f_std_points", "f_last_points",
    "f_l3_targets", "f_l3_carries", "f_l3_rec", "f_l3_tgtshare", "f_l3_ayshare",
    "f_games", "f_opp_dvp", "f_pos", "f_impl_total", "f_home",
]

if __name__ == "__main__":
    from data import load
    df = build(load([2023, 2024]))
    ready = df[df["f_l3_points"].notna()]
    print(f"rows {len(df)}, usable (has prior form) {len(ready)}")
    print(df[["player_display_name", "season", "week", "position", "league_points"] + FEATURES].tail(4).to_string())
