# The model, Checkpoint 18a

A weekly fantasy model, trained on historical NFL data, scored on this
league's rulebook. This directory is the proof it earns its place before any
of it is wired into the app.

## What it does

Predicts a player's fantasy points for the coming week from what is knowable
before kickoff: his recent usage and form, the defence he faces, and the Vegas
line on his game. QB, RB, WR and TE only. Kickers and defences score on
categories the weekly data does not carry and stay on the deterministic engine
from Checkpoint 14.

## The rule this exists to keep

Not one invented number. The target is computed from raw stat components on
this league's scoring, never taken from nflverse's standard PPR field. Every
feature is shifted back a week so the model can never see the game it predicts.
And it ships nothing it has not proved: the backtest trains on 2018-2023, tests
on the whole held-out 2024 season, and reports the error against the baselines
it must beat.

## What the backtest actually found

Mean absolute error against actual points, 2024 held out, lower is better:

    pos     n      last-3   season   MODEL    verdict
    ALL   4668     5.21     4.99     4.89     +2.0% vs best baseline
    QB     586     6.50     6.33     6.00     +5.2%
    RB    1208     5.14     5.00     4.90     +2.1%
    WR    1905     5.40     5.09     5.04     +1.0%
    TE     969     4.15     3.96     3.91     +1.2%

Two honest readings of that:

  - The point projection beats a season average modestly. That is not a weak
    model, it is the nature of fantasy: week to week scoring is mostly noise
    and a season average is a hard baseline to beat. QB gains most, because a
    quarterback's week bends to the game environment the Vegas line captures.

  - The real product is the distribution. The quantile models are calibrated
    almost exactly: of the weeks that actually happened, 20% landed under the
    20th percentile, 49% under the 50th, 80% under the 80th. So the floor, the
    ceiling and the boom/bust probabilities are trustworthy, which is the thing
    neither Sleeper's single number nor a season average gives at all.

## What is NOT claimed

That it beats Sleeper's own projection. Sleeper does not publish its past
projections, so there is no honest way to backtest against them historically.
The baselines here are naive on purpose, and the claim is only what the numbers
above show.

## Running it

    pip install -r requirements.txt
    python backtest.py        # the numbers above
    python features.py        # inspect the feature matrix
    python data.py            # target sanity check

Historical parquet is cached under .cache (gitignored) and fetched from the
nflverse releases on a cold run.
