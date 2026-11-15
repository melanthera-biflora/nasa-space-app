"""Patterns across variables and signs of change for a place (SPEC A4). Reuses the stored neutral report (an
address) or the state series (a state), so it only computes; results are kept in memory for repeat views."""
import pandas as pd

from analysis import enso
from analysis import patterns as pt
from sources import indices
from backend.errors import ApiError
from backend.services.regions import FIRST
from backend.store.files import _Lru

# Pairs worth asking about: (id, words, A, B, B low?). Only pairs whose series exist at the place are used.
COMPOUND = [
    ("hot_dry", "Hot and dry months", "hot_days", "rain_sat", True),
    ("hot_smoky", "Hot and smoky months", "hot_days", "smoke_days", False),
    ("humid_nights", "Humid days with warm nights", "humid_heat_days", "warm_nights", False),
    ("state_hot_dry", "Hot and dry months", "t2m", "precip", True),
    ("state_hot_smoky", "Hot and smoky months", "t2m", "smoke_days", False),
    ("state_dry_soil_heat", "Dry soil and heat together", "t2m", "gwetroot", True),
]
STATE_VARS = ("t2m", "precip", "gwetroot", "smoke_days", "aod", "water_storage", "pm25")


def _series(factor):
    rows = [(m["month"], m["value"]) for m in factor.get("monthly") or [] if m.get("value") is not None]
    if not rows:
        return None
    s = pd.Series([v for _, v in rows], index=pd.to_datetime([m for m, _ in rows]))
    return s if s.std() > 0 else None


class PatternsService:
    def __init__(self, reports, regions):
        self.reports, self.regions, self._done = reports, regions, _Lru(32)

    def pair(self, place, a, b, period=25):
        """The two records of one link, as the test saw them, for the pair chart (no statistics in the browser)."""
        if place["kind"] == "state":
            factors = {}
            for var in (a, b):
                if var not in STATE_VARS:
                    raise ApiError(400, "invalid_input", f"{var} is not one of this page's state records.")
                factors[var] = self.regions.series(place["code"], var, period)["factor"]
        else:
            factors = self.reports.neutral(round(place["lat"], 2), round(place["lon"], 2), period)["factors"]
        series = {k: _series(factors[k]) for k in (a, b) if k in factors and factors[k].get("available")}
        if len(series) < 2 or any(v is None for v in series.values()):
            raise ApiError(404, "not_found", "One of these records has no monthly data here.")
        return {"a": a, "b": b, "months": pt.pair_lines(series[a], series[b])}

    def for_point(self, lat, lon, period=25):
        lat, lon = round(lat, 2), round(lon, 2)
        key = ("point", lat, lon, period)
        if (hit := self._done.get_fresh(key)) is not None:
            return hit
        rep = self.reports.neutral(lat, lon, period)
        factors = {k: f for k, f in rep["factors"].items() if f.get("available") and not f.get("constant")}
        out = self._analyze(factors, {"kind": "point", "lat": lat, "lon": lon}, rep.get("period"))
        # keep only results from a complete report, as the report store does: a passing outage must not stick; the
        # page says when it isn't complete, since its counts can change on the next visit (L9)
        out["complete"] = all(v == "ok" or k == "surface_heat" for k, v in rep.get("data_status", {}).items())
        if out["complete"]:
            self._done.put(key, out)
        return out

    def for_state(self, code, period=25):
        code = code.upper()
        key = ("state", code, period)
        if (hit := self._done.get_fresh(key)) is not None:
            return hit
        factors, name, complete = {}, code, True
        for var in STATE_VARS:
            try:
                body = self.regions.series(code, var, min(period, 25) if var in ("pm25",) else period)
            except ApiError as e:
                if e.status == 404:
                    raise
                complete = complete and e.status < 500     # an upstream failure is not cached; a period it can't cover is
                continue                              # a variable that can't cover this period is left out
            name = body["region"]["name"]
            if body["factor"].get("available"):
                factors[var] = body["factor"]
        out = self._analyze(factors, {"kind": "state", "code": code, "name": name}, None)
        out["complete"] = complete
        if complete:
            self._done.put(key, out)
        return out

    @staticmethod
    def _analyze(factors, place, period):
        series = {k: s for k, f in factors.items() if (s := _series(f)) is not None}
        labels = {k: f["label"] for k, f in factors.items()}
        relations = pt.relations(series, labels, pt.FAMILIES)
        # clear links across datasets first (the findings), then links inside one dataset, then the rest
        relations.sort(key=lambda t: (not t["clear"], t["same_source"], -abs(t["r"])))
        for t in relations:
            if t["clear"] and not t["same_source"] and t["lag"] > 0:
                t["lead_hits"] = pt.lead_hits(series[t["a"]], series[t["b"]], t["lag"], t["r"])
        warnings = []
        for k, s in series.items():
            w, e = pt.warning_signs(s), pt.exceedance(s)
            if w or e:
                warnings.append({"key": k, "label": labels[k], "unit": factors[k].get("unit_short"), "signs": w, "exceedance": e})
        compound = []
        for cid, words, a, b, low in COMPOUND:
            if a in series and b in series and (c := pt.compound(series[a], series[b], b_low=low)):
                compound.append({"id": cid, "label": words, "a": a, "b": b, **c})
        units = {k: f.get("unit_short") for k, f in factors.items()}
        roni = indices.roni()
        return {"place": place, "period": period, "relations": relations[:20], "relations_tested": relations[0]["m"] if relations else 0,
                "labels": labels, "units": units, "warnings": warnings, "compound": compound,
                # records that start late (PM2.5 after the 2009-10 step, D41) start their winters late too
                "winters": enso.winters(series, labels, units, roni, FIRST) if roni else None}
