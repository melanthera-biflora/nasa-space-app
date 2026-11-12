"""
Turning numbers into a judgement: level now (Suitable / Caution / High risk,
or None for trend-only cards) and trend direction (worsening / improving / no clear trend).
"""

def level_for(value, cfg):
    if cfg.get("caution_from") is None or value is None:
        return None                              # trend-only card
    if cfg.get("high_from") is not None and value >= cfg["high_from"]:
        return "high_risk"
    return "caution" if value >= cfg["caution_from"] else "suitable"


def trend_direction(tr, cfg):
    if not tr["significant"]:
        return "no_clear_trend"
    rising = tr["slope_per_decade"] > 0
    return "worsening" if rising == cfg.get("higher_is_worse", True) else "improving"
