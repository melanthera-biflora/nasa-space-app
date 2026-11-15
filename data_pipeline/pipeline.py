"""
Climatch data pipeline: the ONE function the backend calls.

    build_report(lat, lon, condition, age_group, period_years) -> one JSON-ready report

It collects every data source, runs the same analysis on each factor, then orders the
cards for the person and picks the actions. The pieces live in:

    sources/    getting the data   (power, modis_lst, pm25_merra2, no2_omi, fires_firms)
    analysis/   the statistics     (trends, verdict, story, timeline)
    config/     shared settings    (thresholds, narratives, conditions)
    ai/         optional AI story  (story_writer)
    tools/      helpers            (export_demo, compare_cities, explore notebook)

Run from the data_pipeline folder:
    python pipeline.py 33.45 -112.07 asthma_copd 65_plus
"""
import importlib
import json
import sys

import numpy as np
import pandas as pd

from paths import OUTPUT_DIR, load_json, load_thresholds
from sources.power import POWER_START_YEAR, fetch_power, power_series
# also available as pipeline.<name>, so the notebook and older code keep working
from sources.power import (clean_daily, daily_flags, annual_counts, monthly_counts,  # noqa: F401
                           wettest_day, compare_heat_cutoffs)
from analysis.trends import monthly_anomaly, trend_stats
from analysis.seasonal import leave_one_out, monthly_z, seasonal_block
from analysis.verdict import level_for, trend_direction
from analysis.story import describe
from analysis.timeline import monthly_classes, timeline_extras, notable_years

# extra data sources: factor -> (module, function). Each function returns
# {factor_key: {"annual": Series(index=year), "monthly": Series(index=dates)}}
EXTRA_SOURCES = {
    "pm25": ("sources.pm25_merra2", "pm25_series"),
    "no2": ("sources.no2_omi", "no2_series"),
    "fires": ("sources.fires_firms", "fires_series"),
    "surface_heat": ("sources.modis_lst", "surface_heat_series"),
    # A3 data additions (docs/DATA_ADDITIONS.md)
    "smoke": ("sources.extras", "smoke_days_series"),
    "aod": ("sources.extras", "aod_series"),
    "rain_sat": ("sources.extras", "rain_sat_series"),
    "surface_heat_5km": ("sources.extras", "surface_heat_5km_series"),
    "water": ("sources.extras", "water_storage_series"),
}
ADDED_SOURCES = ("smoke", "aod", "rain_sat", "surface_heat_5km", "water")
LEVEL_ORDER = {"high_risk": 0, "caution": 1, "suitable": 2, None: 3}


def clean_json(obj):
    """Replace NaN / infinity with None (null) everywhere - NaN is not valid JSON."""
    if isinstance(obj, float):
        return obj if np.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean_json(v) for v in obj]
    if isinstance(obj, np.generic):
        return clean_json(obj.item())
    return obj


def _r(v, d):
    return None if v is None else round(v, d + 1)


def make_factor(key, annual, monthly, th, narr, start_year, end_year):
    cfg, st = th[key], th["settings"]
    tr = trend_stats(annual, start_year, end_year, st["compare_window_years"],
                     st["significance_alpha"], st["min_years_for_trend"])
    if tr is None:
        return {"key": key, "label": cfg["label"], "available": False, "parent": cfg.get("parent"),
                "reason": "not enough years of data in this period"}
    m = pd.Series(monthly).dropna()
    m = m[(m.index.year >= tr["period"][0]) & (m.index.year <= tr["period"][1])]
    anom = monthly_anomaly(m)
    d = cfg.get("decimals", 1)
    return {
        "key": key, "label": cfg["label"], "available": True,
        "constant": bool(tr.get("constant", False)),   
        "parent": cfg.get("parent"), "unit": cfg["unit"], "unit_short": cfg["unit_short"],
        "data_source": cfg.get("data"),
        "definition": narr.get("definition"),
        "caveat": narr.get("caveat"),
        **{k: tr[k] for k in ("period", "n_years", "then_years", "now_years", "significant",
                              "significance_label", "p_label", "mk_p", "points", "line")},
        "then": _r(tr["then"], d), "now": _r(tr["now"], d),
        "change_then_to_now": _r(tr["now"] - tr["then"], d),
        "slope_per_decade": _r(tr["slope_per_decade"], d),
        "slope_ci95_per_decade": [_r(v, d) for v in tr["slope_ci95_per_decade"]],
        "usual_range": [_r(v, d) for v in tr["usual_range"]],
        "level": level_for(tr["now"], cfg),
        "trend_direction": trend_direction(tr, cfg),
        "limits": {"caution_from": cfg.get("caution_from"), "high_from": cfg.get("high_from"),
                   "source": cfg.get("cutoff_source") or cfg.get("caution_source"),
                   "high_source": cfg.get("high_source"),
                   "reference_only": cfg.get("reference_only")},
        "story": describe(tr, cfg, narr),
        "timeline": timeline_extras(tr["points"], cfg),
        "source": {"name": narr.get("source_name"), "url": narr.get("source_url")},
        "monthly": [{"month": t.strftime("%Y-%m"), "value": round(float(v), 3), "anomaly": round(float(a), 3),
                     "z": _r(z, 2)} for t, v, a, z in zip(m.index, m.values, anom.values, monthly_z(m).values)],
        "monthly_classes": monthly_classes(m.values, anom.values),
        "seasonal": seasonal_block(m, agg=season_agg(key, cfg), alpha=st["significance_alpha"],
                                   min_years=st["min_years_for_trend"], decimals=d),
        "leave_one_out": leave_one_out(tr["points"], st["significance_alpha"], d),
    }


def season_agg(key, cfg):
    """How three months make a season: counts add up, the wettest day is the biggest, levels average."""
    return cfg.get("agg") or ("sum" if "/ year" in cfg["unit"] else "max" if key == "wettest_day" else "mean")


def load_extra(lat, lon, sources):
    out, status = {}, {}
    for key in sources:
        module_name, func = EXTRA_SOURCES[key]
        try:
            out.update(getattr(importlib.import_module(module_name), func)(lat, lon))
            status[key] = "ok"
        except Exception as e:             
            status[key] = f"not available: {type(e).__name__}: {e}"
    return out, status

def _as_list(condition, valid):
    items = condition.split(",") if isinstance(condition, str) else list(condition or [])
    keys = [c.strip() for c in items if c and c.strip() in valid]
    keys = list(dict.fromkeys(k for k in keys if k != "none"))
    return keys or ["none"]


def _take_turns(lists):
    out = []
    for i in range(max((len(x) for x in lists), default=0)):
        for x in lists:
            if i < len(x) and x[i] not in out:
                out.append(x[i])
    return out


def _join(words):
    words = list(words)
    return words[0] if len(words) == 1 else ", ".join(words[:-1]) + " and " + words[-1]


def _lower_first(text):
    return text[:1].lower() + text[1:]
    
def build_neutral_report(lat, lon, period_years=None, sources=("pm25", "no2", "fires", "surface_heat") + ADDED_SOURCES,
                         daily=None, extra=None, end_year=None):
    """Everything the website needs for one location that is the same for every household (SPEC A3: this is what
    gets stored; apply_household adds the household part per request and is never stored).

    condition: one key or a list of keys from conditions.json, e.g. ["asthma_copd", "heart_disease"]
    age_group: one key, a list of keys or "a,b" from conditions.json (every household member counts)

    period_years: 10, 15, 20 or 25 (the "period to analyze" box). Default from thresholds.json.
    sources: which extra data sources to use (MODIS heat is slow the first time for a new place).
    daily / extra: only for testing with fake data.
    """
    th, narr = load_thresholds(), load_json("narratives.json")
    st = th["settings"]
    period = int(period_years or st["default_period"])
    data_end = st["data_end_year"]
    end_year = min(int(end_year or data_end), data_end)     # custom periods end earlier (A3, custom-period)
    start_year = end_year - period + 1

    if daily is None:
        daily = fetch_power(lat, lon, POWER_START_YEAR, data_end)
    series, bad_years = power_series(daily, th, st["min_valid_days_per_year"])

    status = {"power": "ok"}
    if extra is None:
        extra, extra_status = load_extra(lat, lon, sources)
        status.update(extra_status)
    series.update(extra)

    factors = {k: make_factor(k, v["annual"], v["monthly"], th, narr.get(k, {}), start_year, end_year)
               for k, v in series.items() if k in th}

    main = [f for f in factors.values() if f["available"] and not f.get("parent")]
    levels = [f["level"] for f in main if f["level"]]
    overall = ("high_risk" if "high_risk" in levels else "caution" if "caution" in levels
               else "suitable")

    return clean_json({
        "location": {"lat": lat, "lon": lon},
        "period": [start_year, end_year],
        "overall": overall,
        "verdict_rule": st["verdict_rule"],
        "notable_years": notable_years(factors),
        "factors": factors,
        "other_checks": narr.get("other_checks", []),
        "data_status": status,
        "data_quality": {"incomplete_years": bad_years},
        "thresholds_version": th["version"],
    })


HOUSEHOLD_KEYS = ("user", "not_good_for", "overall_drivers", "worsening_factors", "card_order", "actions")
HOUSEHOLD_FACTOR_KEYS = ("priority_for_user", "affects", "health_flag")


def strip_household(report):
    """A full report back to its household-neutral part (to store a saved demo report without its household)."""
    out = {k: v for k, v in report.items() if k not in HOUSEHOLD_KEYS}
    out["factors"] = {k: {a: b for a, b in f.items() if a not in HOUSEHOLD_FACTOR_KEYS} for k, f in report["factors"].items()}
    return out


def apply_household(neutral, condition="none", age_group="18_64", cond=None, narr=None):
    """Add one household's view to a neutral report: card order, priorities, health notes and actions.
    Pure: returns a new report and leaves `neutral` (the stored one) untouched.

    condition: one key or a list of keys from conditions.json, e.g. ["asthma_copd", "heart_disease"]
    age_group: one key, a list of keys or "a,b" from conditions.json (every household member counts)
    """
    cond = cond or load_json("conditions.json")
    narr = narr or load_json("narratives.json")
    factors = {k: dict(f) for k, f in neutral["factors"].items()}
    main = [f for f in factors.values() if f["available"] and not f.get("parent")]
    overall = neutral["overall"]
    conditions = _as_list(condition, cond["conditions"])
    groups = [(c, cond["conditions"][c]) for c in conditions if c != "none"]
    # a household can have several age groups: one key, a list, or "a,b"
    raw_ages = age_group.split(",") if isinstance(age_group, str) else list(age_group or [])
    ages = list(dict.fromkeys(a.strip() for a in raw_ages if a.strip() in cond["age_groups"]))
    groups += [(a, cond["age_groups"][a]) for a in ages]

    prio = _take_turns([g["priority"] for _, g in groups if g.get("priority")] or
                       [cond["conditions"]["none"]["priority"]])
    for f in factors.values():
        f["priority_for_user"] = f["key"] in prio
        affects = [g["label"] for _, g in groups if f["key"] in g.get("priority", [])]
        f["affects"] = affects
        f["health_flag"] = None
        if f.get("available") and affects:
            names = _join(_lower_first(a) for a in affects)
            if f["level"] == "high_risk":
                f["health_flag"] = {"level": "not_good", "groups": affects, "text": f"Not good for {names}"}
            elif f["level"] == "caution" or f["trend_direction"] == "worsening":
                f["health_flag"] = {"level": "take_care", "groups": affects, "text": f"Take care for {names}"}
                
    order = sorted([f["key"] for f in main],
                   key=lambda k: (factors[k]["constant"],
                                  0 if k in prio else 1,
                                  prio.index(k) if k in prio else 99,
                                  LEVEL_ORDER[factors[k]["level"]]))

    actions = []
    for k in order:
        f = factors[k]
        if f["level"] in ("caution", "high_risk") or f["trend_direction"] == "worsening":
            n = narr.get(k, {})
            if n.get("actions"):
                actions.append({"factor": k, "label": f["label"], "actions": n["actions"],
                                "source": {"name": n.get("actions_source_name") or n.get("source_name"),     # health guidance
                                           "url": n.get("actions_source_url") or n.get("source_url")}})       # over the data source
                
    not_good_for = []
    for _, g in groups:
        bad = [factors[k]["label"] for k in order + [k for k in factors if factors[k].get("parent")]
               if factors[k].get("health_flag") and g["label"] in factors[k]["health_flag"]["groups"]]
        if bad:
            not_good_for.append({"group": g["label"], "factors": bad,
                                 "text": f"{g['label']}: {_join(bad)}"})
            
    return clean_json({
        "location": neutral["location"],
        "user": {"condition": conditions[0], "conditions": conditions,
                 "condition_labels": [cond["conditions"][c]["label"] for c in conditions],
                 "age_group": ages[0] if ages else age_group, "age_groups": ages,
                 "age_group_label": cond["age_groups"].get(ages[0], {}).get("label") if ages else age_group,
                 "age_group_labels": [cond["age_groups"][a]["label"] for a in ages]},
        "not_good_for": not_good_for,
        "period": neutral["period"],
        "overall": overall,
        "overall_drivers": [factors[k]["label"] for k in order if factors[k]["level"] == overall],
        "worsening_factors": [factors[k]["label"] for k in order
                              if factors[k]["trend_direction"] == "worsening"],
        "verdict_rule": neutral["verdict_rule"],
        "card_order": order,
        "notable_years": neutral["notable_years"],
        "factors": factors,
        "actions": actions,
        "other_checks": neutral["other_checks"],
        "data_status": neutral["data_status"],
        "data_quality": neutral["data_quality"],
        "thresholds_version": neutral["thresholds_version"],
    })


def build_report(lat, lon, condition="none", age_group="18_64", period_years=None,
                 sources=("pm25", "no2", "fires", "surface_heat"), daily=None, extra=None, end_year=None):
    """The full report for one location and household (the neutral report plus the household's view)."""
    return apply_household(build_neutral_report(lat, lon, period_years, sources, daily, extra, end_year), condition, age_group)


ARROW = {"worsening": "↑ worse", "improving": "↓ better", "no_clear_trend": "→ no clear trend"}


def print_report(rep):
    print(f"Overall: {rep['overall']}  (period {rep['period'][0]}–{rep['period'][1]})")
    subs = [k for k, f in rep["factors"].items() if f.get("parent")]
    for k in rep["card_order"] + subs:
        f = rep["factors"][k]
        if not f["available"]:
            print(f"  {f['label']}: {f['reason']}")
            continue
        star = "★" if f["priority_for_user"] else " "
        print(f"{star} {f['label'][:34]:34s} {f['then']:>8} -> {f['now']:>8} {f['unit_short'][:8]:8s} "
              f"{f['slope_per_decade']:+.2f}/dec {f['significance_label']:20s} {f['p_label']:11s} "
              f"[{f['level'] or 'trend only'}] {ARROW[f['trend_direction']]}")
    for item in rep.get("not_good_for", []):
        print("⚠", item["text"])
    print("Data sources:", rep["data_status"])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")   # Windows consoles default to cp1252 and crash on ★ → ↑ ↓
    a = sys.argv[1:]
    lat, lon = (float(a[0]), float(a[1])) if len(a) >= 2 else (33.45, -112.07)
    condition = a[2] if len(a) >= 3 else "none"
    age = a[3] if len(a) >= 4 else "18_64"
    rep = build_report(lat, lon, condition, age)
    print_report(rep)
    k0 = rep["card_order"][0]
    print("\nExample story for", rep["factors"][k0]["label"])
    for s in rep["factors"][k0]["story"].values():
        print(" -", s)
    OUTPUT_DIR.mkdir(exist_ok=True)
    out = OUTPUT_DIR / f"report_{lat}_{lon}.json"
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(rep, fh, indent=1, ensure_ascii=False, allow_nan=False)
    print("\nSaved", out)


REGION_START_YEAR = 1981            # POWER's first year; lets "Try a longer series" go back further than 2001
GRID_FILES = {"pm25": "sources.pm25_merra2", "no2": "sources.no2_omi"}


def _annual(monthly, agg):
    """Yearly values from complete years only (12 months)."""
    g = monthly.groupby(monthly.index.year)
    full = g.count() == 12
    return getattr(g, agg)()[full]


def build_region(code, var, period_years=None, end_year=None):
    """One variable averaged over a US state, in the same shape as a report card (make_factor), so the website
    can show it with the same charts. POWER variables come live from its regional API; PM2.5 and NO2 from our files."""
    from sources import extras, power_region
    import xarray as xr

    th, narr = load_thresholds(), load_json("narratives.json")
    states, region_vars = power_region.load_states(), load_json("region_vars.json")
    if code not in states:
        raise ValueError(f"unknown state {code}")
    st = th["settings"]
    end_year = min(int(end_year or st["data_end_year"]), st["data_end_year"])
    if var in region_vars:
        cfg, note = region_vars[var], region_vars[var]
        monthly = power_region.fetch_state_monthly(code, cfg, REGION_START_YEAR, st["data_end_year"])   # one cache; the period cuts it
        first = REGION_START_YEAR
    elif var in GRID_FILES:
        cfg, note = th[var], narr.get(var, {})
        mod = importlib.import_module(GRID_FILES[var])
        with xr.open_dataarray(mod.OUT) as da:
            monthly = power_region.grid_state_monthly(da, code)
        if getattr(mod, "FIRST_TREND_YEAR", None):          # PM2.5 from 2010 (D41)
            monthly = monthly[pd.to_datetime(monthly.index).year >= mod.FIRST_TREND_YEAR]
    elif var in extras.GRID:                        # A3 data additions: their own yearly rules (sources/extras.py)
        cfg, note = th[var], narr.get(var, {})
        s = extras.state_series(code, var)
        monthly, given_annual = s["monthly"], s["annual"]
    else:
        raise ValueError(f"unknown variable {var}")
    region = {"code": code, "name": states[code]["name"], "kind": "state", "bbox": states[code]["bbox"]}
    if var not in region_vars:
        if pd.Series(monthly, dtype=float).dropna().empty:      # the grids cover the lower 48 (not Alaska, Hawaii, PR)
            return clean_json({"region": region, "variable": var, "period_years": None, "first_year_available": None,
                               "factor": {"key": var, "label": cfg["label"], "available": False, "parent": cfg.get("parent"),
                                          "reason": "this dataset's grid covers the lower 48 states only"}})
        first = int(monthly.dropna().index.year.min())
    period = int(period_years or st["default_period"])
    start_year = max(first, end_year - period + 1)
    agg = cfg.get("agg") or ("sum" if "/ year" in cfg["unit"] else "mean")
    annual = given_annual if var in extras.GRID else _annual(monthly, agg)
    factor = make_factor(var, annual, monthly, {var: {**cfg, "agg": agg}, "settings": st},
                         note, start_year, end_year)
    return clean_json({
        "region": region, "variable": var, "period_years": end_year - start_year + 1, "first_year_available": first,
        "factor": factor,
    })


# Week-by-week view (SPEC A3 weekly-view): daily NASA POWER columns, how a week is summed up, and the words.
WEEKLY_VARS = {
    "t2m_max": {"column": "T2M_MAX", "agg": "mean", "label": "Daily high", "unit": "°C", "about": "the average of the 7 daily highs"},
    "t2m_min": {"column": "T2M_MIN", "agg": "mean", "label": "Night low", "unit": "°C", "about": "the average of the 7 nightly lows"},
    "precip": {"column": "PRECTOTCORR", "agg": "sum", "label": "Rain and snow", "unit": "mm", "about": "the week's total"},
    "rh": {"column": "RH2M", "agg": "mean", "label": "Humidity", "unit": "%", "about": "the week's average relative humidity"},
    "wetbulb": {"column": "T2MWET", "agg": "mean", "label": "Wet-bulb temperature", "unit": "°C", "about": "the average of the 7 daily-mean wet-bulb temperatures"},
}


def build_weekly(lat, lon, variable, year, period_years=None, daily=None):
    """One year of one daily NASA POWER variable as 52 weeks, against each week's usual range over the period."""
    from analysis.weekly import weekly_blocks

    if variable not in WEEKLY_VARS:
        raise ValueError(f"unknown weekly variable {variable}")
    st = load_thresholds()["settings"]
    end_year = st["data_end_year"]
    start_year = end_year - int(period_years or st["default_period"]) + 1
    if daily is None:
        daily = fetch_power(lat, lon, POWER_START_YEAR, end_year)
    df, _, _ = clean_daily(daily, st["min_valid_days_per_year"])
    cfg = WEEKLY_VARS[variable]
    if cfg["column"] not in df:
        return None
    out = weekly_blocks(df[cfg["column"]], year, start_year, end_year, cfg["agg"])
    if out is None:
        return None
    return clean_json({**out, "variable": variable, "label": cfg["label"], "unit": cfg["unit"], "about": cfg["about"],
                       "location": {"lat": lat, "lon": lon}, "source": "NASA POWER daily (MERRA-2), ~50 km grid"})
