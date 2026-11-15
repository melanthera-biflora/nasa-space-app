"""Relations, warning signs, exceedance and compound extremes (analysis/patterns.py) on synthetic monthly series."""
import numpy as np
import pandas as pd
import pytest

from analysis import patterns

IDX = pd.date_range("2001-01-01", "2025-12-01", freq="MS")


def seasonal(noise, seed, trend=0.0):
    rng = np.random.default_rng(seed)
    t = np.arange(len(IDX)) / 12
    return pd.Series(10 + 5 * np.sin(2 * np.pi * (IDX.month - 4) / 12) + trend * t + rng.normal(0, noise, len(IDX)), index=IDX)


def test_a_lagged_relation_is_found_and_named():
    rng = np.random.default_rng(1)
    dry = pd.Series(rng.normal(0, 1, len(IDX)), index=IDX)
    heat = dry.shift(2).fillna(0) * 0.8 + rng.normal(0, 0.5, len(IDX))      # dryness leads heat by 2 months
    out = patterns.relations({"dry": dry, "heat": heat, "noise": pd.Series(rng.normal(0, 1, len(IDX)), index=IDX)},
                             labels={"dry": "Dry soil", "heat": "Heat", "noise": "Noise"})
    top = out[0]
    assert (top["a"], top["b"], top["lag"]) == ("dry", "heat", 2) and top["clear"]
    assert top["r"] > 0.6 and "2 months later" in top["sentence"]
    assert not any(r["clear"] for r in out if "noise" in (r["a"], r["b"]))


def test_effective_sample_size_shrinks_with_memory():
    assert patterns.n_effective(300, 0.8, 0.8) < patterns.n_effective(300, 0.0, 0.0) == 300


def test_growing_swings_are_flagged_and_steady_ones_are_not():
    rng = np.random.default_rng(3)
    grow = pd.Series(rng.normal(0, 1, len(IDX)) * np.linspace(0.5, 2.5, len(IDX)), index=IDX)
    w = patterns.warning_signs(grow)
    assert w["variance"]["tau"] > 0.5 and w["variance"]["rising"]
    steady = patterns.warning_signs(pd.Series(rng.normal(0, 1, len(IDX)), index=IDX))
    assert not steady["variance"]["rising"]


def test_exceedance_counts_months_past_the_old_top_ten_percent():
    e = patterns.exceedance(seasonal(1.0, 4, trend=0.15))
    assert e["first"] < e["last"] and e["clear"]
    assert len(e["years"]) == 25


def test_compound_hot_and_dry_months_are_counted_per_year():
    hot = seasonal(1.0, 5, trend=0.1)
    dry = -seasonal(1.0, 6, trend=0.1)            # rain falling as heat rises: more hot-and-dry months
    c = patterns.compound(hot, dry, b_low=False)
    assert sum(c["counts"].values()) > 0 and set(c) >= {"counts", "slope_per_decade", "p", "clear"}


def test_lead_hits_beat_chance_only_when_one_series_leads_the_other():
    rng = np.random.default_rng(7)
    smoke = pd.Series(rng.normal(0, 1, len(IDX)), index=IDX)
    storage = -smoke.shift(2).fillna(0) * 0.9 + rng.normal(0, 0.4, len(IDX))   # smoky months, then low storage
    h = patterns.lead_hits(smoke, storage, lag=2, r=-0.8)
    assert h["cases"] >= 20 and h["rate"] > 0.4 and h["lift"] > 4 and h["clear"]
    assert h["p"] < 0.01            # the floor of the shift test is 1 / (1 + number of shifts), about 0.004
    noise = patterns.lead_hits(smoke, pd.Series(rng.normal(0, 1, len(IDX)), index=IDX), lag=2, r=-0.8)
    assert noise["rate"] < 0.3 and noise["p"] > 0.01 and not noise["clear"]


def test_sentences_agree_with_plural_labels():
    assert patterns._is("Smoke days") == "are" and patterns._is("Rain and snow") == "are"
    assert patterns._is("Fire detections nearby") == "are" and patterns._is("Hottest day of the month") == "is"
    assert patterns._is("Soil wetness (root zone)") == "is" and patterns._is("Water storage (ground, soil, snow)") == "is"


def test_more_extremes_is_not_flagged_when_nothing_changed():
    clear, diffs = 0, []
    for s in range(200):
        e = patterns.exceedance(seasonal(1.0, 1000 + s))
        clear += e["clear"]
        diffs.append(e["last"] - e["first"])
    assert clear / 200 <= 0.08 and abs(np.mean(diffs)) < 0.02


def test_a_gap_in_one_record_does_not_move_the_lag():
    rng = np.random.default_rng(11)
    lead = pd.Series(rng.normal(0, 1, len(IDX)), index=IDX)
    follow = lead.shift(2).fillna(0) * 0.8 + rng.normal(0, 0.5, len(IDX))
    holed = follow.drop(follow.index[100:111])                       # an 11-month hole, as GRACE has in 2017-18
    full = patterns.relations({"a": lead, "b": follow})[0]
    gap = patterns.relations({"a": lead, "b": holed})[0]
    assert (gap["a"], gap["lag"]) == (full["a"], full["lag"]) == ("a", 2)
    assert abs(gap["r"] - full["r"]) < 0.05


def test_every_factor_has_a_dataset_family():
    import json
    from paths import CONFIG_DIR
    keys = [k for k, v in json.loads((CONFIG_DIR / "thresholds.json").read_text(encoding="utf-8")).items() if isinstance(v, dict) and "label" in v]
    assert keys and not [k for k in keys if k not in patterns.FAMILIES]


def test_pair_lines_share_one_calendar_and_keep_gaps():
    rng = np.random.default_rng(5)
    a = pd.Series(rng.normal(0, 1, len(IDX)), index=IDX)
    b = a.drop(a.index[100:111])
    rows = patterns.pair_lines(a, b, smooth=1)
    assert len(rows) == len(IDX) and rows[0]["month"] == "2001-01"
    assert rows[105]["b"] is None and rows[105]["a"] is not None
