"""Does the model actually beat doing nothing clever? Checkpoint 18a.

Train on 2018-2023, test on the whole held-out 2024 season, and put the model
next to the two baselines it has to beat to justify existing:

  l3   predict this week as the average of his last three games
  std  predict this week as his season-to-date average

Mean absolute error, per position, because a tenth of a point off on a kicker
and off on a QB are not the same miss. The rule from Checkpoint 12 stands: if
the model does not beat the baselines, it does not ship, and this prints the
number either way.
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from data import load, POSITIONS
from features import build, FEATURES

TRAIN_YEARS = [2018, 2019, 2020, 2021, 2022, 2023]
TEST_YEAR = 2024


def mae(a, b):
    return float(np.mean(np.abs(np.asarray(a) - np.asarray(b))))


def main():
    df = build(load(TRAIN_YEARS + [TEST_YEAR]))
    # A fair contest needs the baselines defined, so every row must have prior
    # form. That also drops week 1 and anyone with no history, which is correct:
    # nobody can predict a player off zero prior games without making it up.
    df = df[df["f_l3_points"].notna()].copy()

    train = df[df["season"].isin(TRAIN_YEARS)]
    test = df[df["season"] == TEST_YEAR].copy()

    model = HistGradientBoostingRegressor(
        loss="squared_error", max_iter=400, learning_rate=0.05,
        max_leaf_nodes=31, min_samples_leaf=50, random_state=0,
    )
    model.fit(train[FEATURES], train["league_points"])
    test["pred_model"] = model.predict(test[FEATURES])

    print(f"Train {TRAIN_YEARS[0]}-{TRAIN_YEARS[-1]}  ({len(train):,} rows)")
    print(f"Test  {TEST_YEAR}            ({len(test):,} rows)\n")
    print("Mean absolute error, lower is better:")
    print(f"  {'pos':4} {'n':>5} {'l3':>7} {'season':>7} {'MODEL':>7}   verdict")

    rows = [("ALL", test)] + [(p, test[test["position"] == p]) for p in POSITIONS]
    for name, sub in rows:
        if not len(sub):
            continue
        b_l3 = mae(sub["league_points"], sub["f_l3_points"])
        b_std = mae(sub["league_points"], sub["f_std_points"].fillna(sub["f_l3_points"]))
        m = mae(sub["league_points"], sub["pred_model"])
        best_base = min(b_l3, b_std)
        gain = (best_base - m) / best_base * 100
        verdict = f"{gain:+.1f}% vs best baseline" if gain >= 0 else f"{gain:+.1f}% WORSE"
        print(f"  {name:4} {len(sub):>5} {b_l3:>7.2f} {b_std:>7.2f} {m:>7.2f}   {verdict}")

    # The distribution, not just the point. Quantile models give the floor and
    # ceiling, and calibration is the honesty check: of the weeks that actually
    # happened, the share landing under each quantile should match the quantile.
    print("\nDistribution calibration (share of actuals under each quantile):")
    for q in (0.2, 0.5, 0.8):
        qm = HistGradientBoostingRegressor(
            loss="quantile", quantile=q, max_iter=300, learning_rate=0.05,
            max_leaf_nodes=31, min_samples_leaf=50, random_state=0,
        )
        qm.fit(train[FEATURES], train["league_points"])
        pred = qm.predict(test[FEATURES])
        covered = float(np.mean(test["league_points"].to_numpy() <= pred))
        print(f"  q{int(q*100):>2}: {covered*100:5.1f}% under  (target {int(q*100)}%)")


if __name__ == "__main__":
    main()
