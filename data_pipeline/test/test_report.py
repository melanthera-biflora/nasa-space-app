"""The whole report (pipeline.build_report), with fake data and no internet."""
import json

import pipeline as p


def report(daily, extra, **kw):
    return p.build_report(33.45, -112.07, daily=daily, extra=extra, **kw)


def test_report_is_strict_valid_json(daily, fake_extra):
    rep = report(daily, fake_extra)
    json.dumps(rep, allow_nan=False)            # fails if any NaN slipped through


def test_every_card_has_the_four_story_sentences(daily, fake_extra):
    rep = report(daily, fake_extra)
    for k in rep["card_order"]:
        assert set(rep["factors"][k]["story"]) == {"happened", "is_it_real", "why_it_matters",
                                                    "what_it_likely_means"}


def test_no_future_numbers_in_the_story(daily, fake_extra):
    rep = report(daily, fake_extra)
    text = json.dumps([f["story"] for f in rep["factors"].values() if f.get("available")])
    for year in ("2030", "2035", "2040", "2046", "2050"):
        assert year not in text


def test_conditions_change_the_order_not_the_numbers(daily, fake_extra):
    a = report(daily, fake_extra, condition="asthma_copd")
    b = report(daily, fake_extra, condition="heart_disease")
    assert a["card_order"][0] != b["card_order"][0]
    assert a["factors"]["hot_days"]["now"] == b["factors"]["hot_days"]["now"]
    assert a["overall"] == b["overall"]


def test_several_conditions_take_turns(daily, fake_extra):
    rep = report(daily, fake_extra, condition=["asthma_copd", "heart_disease"], age_group="18_64")
    top4 = rep["card_order"][:4]
    assert "pm25" in top4 and "hot_days" in top4             # one from each condition near the top
    assert rep["user"]["conditions"] == ["asthma_copd", "heart_disease"]


def test_comma_text_and_list_give_the_same_result(daily, fake_extra):
    a = report(daily, fake_extra, condition="asthma_copd,heart_disease")
    b = report(daily, fake_extra, condition=["asthma_copd", "heart_disease"])
    assert a["card_order"] == b["card_order"]


def test_unknown_condition_falls_back_safely(daily, fake_extra):
    rep = report(daily, fake_extra, condition="not_a_condition")
    assert rep["user"]["conditions"] == ["none"]


def test_high_risk_card_says_not_good_for(daily, fake_extra):
    rep = report(daily, fake_extra, condition="heart_disease", age_group="65_plus")
    hot = rep["factors"]["hot_days"]
    assert hot["level"] == "high_risk"                        # fake data is very hot
    assert hot["health_flag"]["level"] == "not_good"
    assert hot["health_flag"]["text"].startswith("Not good for")
    assert "heart disease" in hot["health_flag"]["text"]


def test_trend_only_card_never_drives_the_verdict(daily, fake_extra):
    rep = report(daily, fake_extra)
    assert rep["factors"]["no2"]["level"] is None             # NO2 has no official limit


def test_ten_year_period(daily, fake_extra):
    rep = report(daily, fake_extra, period_years=10)
    hot = rep["factors"]["hot_days"]
    assert rep["period"] == [2016, 2025]
    assert hot["then_years"] == [2016, 2020] and hot["now_years"] == [2021, 2025]


def test_missing_source_does_not_break_the_report(daily):
    rep = p.build_report(33.45, -112.07, daily=daily, extra={})   # no PM2.5 / NO2 / fires
    assert "pm25" not in rep["card_order"]
    assert rep["card_order"]                                  # weather cards still there
