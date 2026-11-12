"""
The 4 template sentences for each card:
happened -> is it real -> why it matters -> what it likely means. Never a future number.
(The optional AI version is in ai/story_writer.py; it falls back to these.)
"""
from analysis.verdict import trend_direction


def fmt(v, d):
    return f"{v:,.{d}f}"


def describe(tr, cfg, narr):
    """The 4 sentences: happened -> real? -> why it matters -> likely meaning.
    Never gives a number for the future."""
    d, u, label = cfg.get("decimals", 1), cfg["unit_short"], cfg["label"]
    per_year = " a year" if cfg["unit"].startswith(("days", "nights", "fire")) else ""
    if tr.get("constant"):
        p0, p1 = tr["period"]
        if tr["now"] == 0:
            happened = f"{label}: none at all in any year from {p0} to {p1}."
            likely = "This hasn't happened here in the whole record, so it isn't a concern for this place."
        else:
            happened = f"{label}: exactly {fmt(tr['now'], d)} {u}{per_year} every year from {p0} to {p1}."
            likely = "It has stayed the same every year, so expect the same."
        return {"happened": happened,
                "is_it_real": "There is no change to test: the value was the same every year.",
                "why_it_matters": narr.get("health_link", ""), "what_it_likely_means": likely}
    happened = (f"{label}: {fmt(tr['then'], d)} {u}{per_year} on average in "
                f"{tr['then_years'][0]}–{tr['then_years'][1]}, compared with "
                f"{fmt(tr['now'], d)} {u}{per_year} in {tr['now_years'][0]}–{tr['now_years'][1]}.")
    sd = max(d, 1)
    lo, hi = tr["slope_ci95_per_decade"]
    slope_txt = (f"{tr['slope_per_decade']:+.{sd}f} {u} per decade "
                 f"(95% CI {lo:+.{sd}f} to {hi:+.{sd}f})")
    if tr["significant"]:
        real = f"The trend is {slope_txt} and statistically significant (Mann-Kendall {tr['p_label']})."
    else:
        real = (f"The trend is {slope_txt}, but not statistically significant yet ({tr['p_label']}): "
                f"it could still be normal year-to-year ups and downs. A longer record may settle it.")
    direction = trend_direction(tr, cfg)
    if direction == "worsening":
        likely = (f"This has been getting worse steadily. If the pattern holds, coming years are likely "
                  f"to look more like {tr['now_years'][0]}–{tr['now_years'][1]} than like the early "
                  f"years — or worse.")
    elif direction == "improving":
        likely = (f"This has been improving steadily, so recent years "
                  f"({tr['now_years'][0]}–{tr['now_years'][1]}) are a better guide than older ones.")
    else:
        likely = (f"No clear direction, so expect most years in the usual range of about "
                  f"{fmt(tr['usual_range'][0], d)}–{fmt(tr['usual_range'][1], d)} {u}.")
    return {"happened": happened, "is_it_real": real,
            "why_it_matters": narr.get("health_link", ""), "what_it_likely_means": likely}
