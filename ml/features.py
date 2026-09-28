"""Leakage-safe features from Sleeper weekly data. Checkpoint 18b.

Same discipline as before: every feature describing week W is built only from
weeks before W, so the model can never see the game it predicts. Retargeted to
Sleeper's field names, and richer for it, because Sleeper carries snap counts
the nflverse weekly file did not, and snap share is the cleanest read on a
player's role there is.
"""

from __future__ import annotations
import pandas as pd

DVP_SHRINK = 4


def _rolling_prior(g: pd.Series, window: int) -> pd.Series:
    return g.shift(1).rolling(window, min_periods=1).mean()


def build(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["player_id", "season", "week"]).copy()

    # Shares are of the team's week, so team totals come first.
    team = df.groupby(["season", "week", "team"], sort=False)
    df["_team_tgt"] = team["rec_tgt"].transform("sum")
    df["_team_ay"] = team["rec_air_yd"].transform("sum")
    df["_tgt_share"] = (df["rec_tgt"] / df["_team_tgt"]).fillna(0)
    df["_ay_share"] = (df["rec_air_yd"] / df["_team_ay"]).fillna(0)
    df["_snap_share"] = (df["off_snp"] / df["tm_off_snp"]).replace([float("inf")], 0).fillna(0)

    grp = df.groupby(["player_id", "season"], sort=False)
    df["f_l3_points"] = grp["league_points"].transform(lambda s: _rolling_prior(s, 3))
    df["f_std_points"] = grp["league_points"].transform(lambda s: s.shift(1).expanding().mean())
    df["f_last_points"] = grp["league_points"].transform(lambda s: s.shift(1))
    for col, name in [
        ("rec_tgt", "f_l3_targets"), ("rush_att", "f_l3_carries"), ("rec", "f_l3_rec"),
        ("_tgt_share", "f_l3_tgtshare"), ("_ay_share", "f_l3_ayshare"),
        ("_snap_share", "f_l3_snapshare"),
    ]:
        df[name] = grp[col].transform(lambda s: _rolling_prior(s, 3))
    df["f_games"] = grp.cumcount()

    df = _opponent_dvp(df)
    df = _schedule(df)
    df["f_pos"] = df["position"].map({"QB": 0, "RB": 1, "WR": 2, "TE": 3}).astype("int64")
    return df


def _opponent_dvp(df: pd.DataFrame) -> pd.DataFrame:
    allowed = (
        df.groupby(["season", "opponent", "position", "week"])["league_points"]
        .sum().reset_index()
        .rename(columns={"league_points": "allowed", "opponent": "defense"})
        .sort_values(["season", "defense", "position", "week"])
    )
    grp = allowed.groupby(["season", "defense", "position"], sort=False)["allowed"]
    allowed["prior_mean"] = grp.transform(lambda s: s.shift(1).expanding().mean())
    allowed["prior_n"] = grp.transform(lambda s: s.shift(1).expanding().count())
    pos_mean = (
        allowed.groupby(["season", "position", "week"])["allowed"].mean()
        .groupby(level=[0, 1]).transform(lambda s: s.shift(1).expanding().mean())
        .rename("pos_mean").reset_index()
    )
    allowed = allowed.merge(pos_mean, on=["season", "position", "week"], how="left")
    n = allowed["prior_n"].fillna(0)
    shrunk = (n * allowed["prior_mean"].fillna(allowed["pos_mean"]) + DVP_SHRINK * allowed["pos_mean"]) / (n + DVP_SHRINK)
    allowed["f_opp_dvp"] = shrunk.fillna(allowed["pos_mean"])
    key = allowed[["season", "defense", "position", "week", "f_opp_dvp"]].rename(columns={"defense": "opponent"})
    return df.merge(key, on=["season", "opponent", "position", "week"], how="left")


def _schedule(df: pd.DataFrame) -> pd.DataFrame:
    from schedule import team_week_env
    # Team codes are already normalised in data.load, so this joins directly.
    # Only the environment columns; the env's own opponent is for the predictor.
    env = team_week_env()[["season", "week", "team", "f_impl_total", "f_home"]]
    return df.merge(env, on=["season", "week", "team"], how="left")


FEATURES = [
    "f_l3_points", "f_std_points", "f_last_points",
    "f_l3_targets", "f_l3_carries", "f_l3_rec",
    "f_l3_tgtshare", "f_l3_ayshare", "f_l3_snapshare",
    "f_games", "f_opp_dvp", "f_pos", "f_impl_total", "f_home",
]

if __name__ == "__main__":
    from data import load
    df = build(load([2023, 2024]))
    miss = df["f_impl_total"].isna().mean()
    print(f"rows {len(df)}, schedule-unmatched {miss*100:.1f}%")
    if miss > 0.02:
        bad = df[df["f_impl_total"].isna()][["season", "team"]].drop_duplicates()
        print("unmatched teams:", bad.to_dict("records")[:20])
    print(df[["player_id", "season", "week", "position", "league_points"] + FEATURES].tail(3).to_string())
