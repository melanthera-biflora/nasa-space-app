"""Levels and trend direction (analysis/verdict.py)."""
from analysis.verdict import level_for, trend_direction

CFG = {"caution_from": 9, "high_from": 15, "higher_is_worse": True}


def test_levels_follow_the_cutoffs():
    assert level_for(5, CFG) == "suitable"
    assert level_for(9, CFG) == "caution"       # the cutoff itself counts
    assert level_for(15, CFG) == "high_risk"


def test_trend_only_card_has_no_level():
    assert level_for(5, {"caution_from": None, "high_from": None}) is None


def test_direction_needs_significance():
    assert trend_direction({"significant": False, "slope_per_decade": 9}, CFG) == "no_clear_trend"
    assert trend_direction({"significant": True, "slope_per_decade": 2}, CFG) == "worsening"
    assert trend_direction({"significant": True, "slope_per_decade": -2}, CFG) == "improving"
