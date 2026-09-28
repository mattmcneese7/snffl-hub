"""The model, in one place. Checkpoint 18b.

One definition of the estimators so the backtest and the live prediction can
never drift into testing one thing and shipping another. A mean model for the
point projection, and a grid of quantile models for the distribution, which is
the calibrated part the app leans on.
"""

from __future__ import annotations
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

from features import FEATURES

QUANTILES = [0.1, 0.25, 0.5, 0.75, 0.9]

_COMMON = dict(max_iter=400, learning_rate=0.05, max_leaf_nodes=31, min_samples_leaf=50, random_state=0)


def train(train_df):
    """Fit the mean model and one model per quantile on a feature frame."""
    X, y = train_df[FEATURES], train_df["league_points"]
    mean = HistGradientBoostingRegressor(loss="squared_error", **_COMMON).fit(X, y)
    quant = {}
    for q in QUANTILES:
        quant[q] = HistGradientBoostingRegressor(loss="quantile", quantile=q, **_COMMON).fit(X, y)
    return mean, quant


def predict(mean, quant, feat_df):
    """Point projection plus a monotone set of quantiles for each row."""
    X = feat_df[FEATURES]
    out = {"proj": np.round(mean.predict(X), 2)}
    # Quantile models are fit independently and can cross on rare rows; sorting
    # each row's predictions restores a valid distribution without pretending to
    # a precision we do not have.
    cols = np.column_stack([quant[q].predict(X) for q in QUANTILES])
    cols = np.sort(cols, axis=1)
    for i, q in enumerate(QUANTILES):
        out[f"p{int(q*100)}"] = np.round(cols[:, i], 2)
    return out
