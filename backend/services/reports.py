"""Reports: check the household and period, reuse a stored report, or build one with the data pipeline.

Only the household-neutral report is stored (SPEC A3, D25): the household (conditions, age groups) is applied per
request by `personalize` and never written to the store, the logs or a key."""
import threading

import requests

from backend.errors import ApiError
from paths import load_json, load_thresholds

DATA_VERSION = "2026-11-15-a7"      # bump when the pipeline's output or the NASA data files change, so stored reports aren't reused

# One build at a time (reports and state series): a build reads the big NetCDF files and adds about 300 MB on top of
# the running API, so two at once would overrun a 512 MB server (Render Starter). A second visitor waits a few seconds;
# one asking for the same place then gets the finished copy from the store.
BUILD_SLOT = threading.Lock()


class ReportService:
    def __init__(self, store, build, heat_ready, personalize=None, conditions=None, thresholds=None):
        cfg = conditions or load_json("conditions.json")
        th = thresholds or load_thresholds()
        self.store, self.build, self.heat_ready = store, build, heat_ready
        self.personalize = personalize or (lambda report, conds, ages: report)
        self.conditions, self.age_groups = list(cfg["conditions"]), list(cfg["age_groups"])
        self.periods = th["settings"]["period_options"]
        self.last_year, self.min_years = th["settings"]["data_end_year"], th["settings"]["min_years_for_trend"]
        self.version = f"{th.get('version')}/{DATA_VERSION}"

    @staticmethod
    def _keys(text, valid, field):
        keys = [k.strip() for k in text.split(",") if k.strip()]
        bad = [k for k in keys if k not in valid]
        if bad:
            raise ApiError(400, "invalid_input", f"Unknown {field}: {', '.join(bad)}. Choose from: {', '.join(valid)}.")
        return keys

    def key(self, lat, lon, period, end=None):
        """The stored-report key: point (2 decimals), period (and end year if not the last) and the versions. No household."""
        span = f"{period}" if end in (None, self.last_year) else f"{end - period + 1}-{end}"
        return f"{lat:.2f},{lon:.2f}|{span}|{self.version}"

    def span(self, period, start, end, first=2001):
        """Check a period: one of the presets, or From-To with at least min_years years inside the data."""
        if start is None and end is None:
            if period not in self.periods:
                raise ApiError(400, "invalid_input", f"period must be one of {self.periods}.")
            return period, self.last_year
        if start is None or end is None:
            raise ApiError(400, "invalid_input", "Give both start and end years.")
        if start < first or end > self.last_year:
            raise ApiError(400, "invalid_input", f"The years must be between {first} and {self.last_year}.")
        if end - start + 1 < self.min_years:
            raise ApiError(400, "invalid_input", f"A trend needs at least {self.min_years} years. Pick an earlier start or a later end.")
        return end - start + 1, end

    def get(self, lat, lon, conditions="none", age_groups="18_64", period=25, start=None, end=None):
        conds = self._keys(conditions, self.conditions, "condition")
        ages = self._keys(age_groups, self.age_groups, "age group")
        return self.personalize(self.neutral(lat, lon, period, start, end), conds, ages)

    def neutral(self, lat, lon, period=25, start=None, end=None):
        """The household-neutral report: from the store, or built (and stored if every source answered)."""
        period, end = self.span(period, start, end)
        lat, lon = round(lat, 2), round(lon, 2)          # ~1 km; matches the POWER and MODIS cache keys
        key = self.key(lat, lon, period, end)
        stored = self.store.get_report(key)
        if stored is not None:
            return stored
        # a new MODIS place takes 25-50 min, so surface heat is shown only where it was precomputed
        heat = self.heat_ready(lat, lon)
        sources = ("pm25", "no2", "fires", "smoke", "aod", "rain_sat", "surface_heat_5km", "water") + (("surface_heat",) if heat else ())
        with BUILD_SLOT:
            stored = self.store.get_report(key)          # built by the visitor ahead in the queue?
            if stored is not None:
                return stored
            try:
                rep = self.build(lat, lon, period_years=period, sources=sources, **({} if end == self.last_year else {"end_year": end}))
            except requests.RequestException:
                raise ApiError(502, "upstream_unavailable", "NASA POWER didn't answer. Try again in a minute, or pick a demo city.")
        # never send exception text (file paths, internals) to the browser
        status = {k: "ok" if v == "ok" else "not available" for k, v in rep["data_status"].items()}
        if not heat:
            status["surface_heat"] = "not available: not precomputed for this place"
        rep["data_status"] = status
        if all(v == "ok" or k == "surface_heat" for k, v in status.items()):   # keep only complete reports
            params = {"lat": lat, "lon": lon, "period": period, "version": self.version}
            self.store.put_report(key, params, rep)
        return rep
