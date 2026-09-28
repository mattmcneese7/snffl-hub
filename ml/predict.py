"""This week's projections, written for the app. Checkpoint 18b.

Trains on every completed week Sleeper serves and predicts the upcoming one,
then writes data/model.json keyed by Sleeper player id, which is the id the app
already uses, so there is no crosswalk and nothing to translate.

For every player with recent form it stores a point projection and a calibrated
distribution: the tenth through ninetieth percentiles of what he is likely to
score, on this league's rules. A player with no recent form gets nothing rather
than a guess, and the app falls back to its deterministic projection for him.
The rule holds: a number appears only where it was computed from real games.
"""

from __future__ import annotations
import json
import os
import subprocess
import pandas as pd

from data import load, _norm
from features import build
from schedule import team_week_env
from model import train, predict as model_predict, QUANTILES

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "model.json")
HISTORY_FROM = 2018


def _state() -> tuple[int, int]:
    out = subprocess.run(["curl", "-sL", "https://api.sleeper.com/state/nfl"],
                         capture_output=True, text=True, timeout=30)
    st = json.loads(out.stdout)
    return int(st["season"]), int(st["week"])


def main():
    season, week = _state()
    print(f"Projecting {season} week {week}")

    # Every completed week: whole prior seasons, plus this season up to now.
    prior_seasons = list(range(HISTORY_FROM, season))
    done = load(prior_seasons)
    if week > 1:
        done = pd.concat([done, load([season], weeks=range(1, week))], ignore_index=True)

    # Placeholder rows for the week being projected, one per player who has
    # played this season, carrying his current team and this week's opponent
    # from the schedule. Their stats are blank: the features that matter are
    # rolled from prior weeks, so nothing here is invented, only positioned.
    this_season = done[done["season"] == season]
    if not len(this_season):
        raise SystemExit("no games this season yet, nothing to project")
    latest = this_season.sort_values("week").groupby("player_id").tail(1)

    env = team_week_env()
    envW = env[(env["season"] == season) & (env["week"] == week)][["team", "opponent", "f_impl_total", "f_home"]]

    holders = latest[["player_id", "position", "team"]].merge(envW, on="team", how="inner")
    # inner join drops anyone on a bye this week, which is correct: no game, no
    # projection.
    ph = pd.DataFrame({
        "player_id": holders["player_id"], "season": season, "week": week,
        "position": holders["position"], "team": holders["team"], "opponent": holders["opponent"],
        "league_points": 0.0, "pass_att": 0.0, "rec_tgt": 0.0, "rush_att": 0.0,
        "rec": 0.0, "rec_air_yd": 0.0, "off_snp": 0.0, "tm_off_snp": 0.0, "involved": 0,
    })

    full = pd.concat([done, ph], ignore_index=True)
    feats = build(full)

    train_rows = feats[(feats["involved"] == 1) & feats["f_l3_points"].notna()]
    target = feats[(feats["season"] == season) & (feats["week"] == week)].copy()
    # Only project players with real recent form; the rest get no model number.
    target = target[target["f_l3_points"].notna()]

    print(f"  train rows {len(train_rows):,} | projecting {len(target)} players")

    mean_m, quant_m = train(train_rows)
    preds = model_predict(mean_m, quant_m, target)

    out = {}
    pcols = [f"p{int(q*100)}" for q in QUANTILES]
    for i, (_, row) in enumerate(target.iterrows()):
        rec = {"proj": float(preds["proj"][i]), "games": int(row["f_games"])}
        for c in pcols:
            rec[c] = float(preds[c][i])
        out[str(row["player_id"])] = rec

    payload = {
        "season": season, "week": week,
        "built_at": pd.Timestamp.utcnow().isoformat(),
        "quantiles": [int(q * 100) for q in QUANTILES],
        "players": out,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print(f"  wrote {len(out)} projections to data/model.json")


if __name__ == "__main__":
    main()
