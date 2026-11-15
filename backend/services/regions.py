"""State averages and the curated event list (SPEC amendment A2)."""
import requests

from backend.errors import ApiError
from backend.services.reports import DATA_VERSION
from paths import load_json, load_thresholds

LONGER = 45          # "Try a longer series": 1981-2025, NASA POWER variables only
LAST_YEAR, MIN_YEARS = 2025, 8
GRID_VARS = ("pm25", "no2", "smoke_days", "aod", "rain_sat", "surface_heat_5km", "water_storage")
FIRST = {"pm25": 2010, "no2": 2005, "smoke_days": 2011, "aod": 2001, "rain_sat": 2001, "surface_heat_5km": 2001, "water_storage": 2002}


NOT_CONTIGUOUS = {"AK", "HI", "PR", "VI", "GU", "AS", "MP"}   # left out of the lower-48 outline


class RegionService:
    def __init__(self, store, build, states, region_vars=None, thresholds=None):
        th = thresholds or load_thresholds()
        rv = region_vars or load_json("region_vars.json")
        self.store, self.build, self.states = store, build, states
        self.periods = list(th["settings"]["period_options"]) + [LONGER]
        self.version = f"{th.get('version')}/{DATA_VERSION}"
        self.variables = [{"key": k, "label": c["label"], "unit": c["unit"], "definition": c["definition"],
                           "first_year": 1981} for k, c in rv.items()]
        self.variables += [{"key": k, "label": th[k]["label"], "unit": th[k]["unit"],
                            "definition": load_json("narratives.json").get(k, {}).get("definition"),
                            "first_year": FIRST[k]} for k in GRID_VARS]

    def list(self):
        return {"regions": [{"code": c, "name": s["name"], "bbox": s["bbox"]} for c, s in sorted(self.states.items())],
                "variables": self.variables, "periods": self.periods}

    def outline(self, code):
        code = code.upper()
        if code == "L48":       # the contiguous states and DC joined: the maps cover everything else with white
            return self.lower_48()
        if code not in self.states:
            raise ApiError(404, "not_found", f"No US state or territory with the code {code}.")
        st = self.states[code]
        return {"code": code, "name": st["name"], "bbox": st["bbox"], "rings": st["rings"]}

    def lower_48(self):
        """Every contiguous state's rings (the map mask's holes) and their combined bbox, in the outline's shape."""
        parts = [s for c, s in self.states.items() if c not in NOT_CONTIGUOUS]
        boxes = [s["bbox"] for s in parts]
        return {"code": "L48", "name": "The lower 48 states and DC", "rings": [r for s in parts for r in s["rings"]],
                "bbox": [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]}

    def series(self, code, variable, period=25, start=None, end=None):
        code = code.upper()
        if code not in self.states:
            raise ApiError(404, "not_found", f"No US state or territory with the code {code}.")
        keys =[v["key"] for v in self.variables]
        if variable not in keys:
            raise ApiError(400, "invalid_input", f"variable must be one of {', '.join(keys)}.")
        first = next(v["first_year"] for v in self.variables if v["key"] == variable)
        if start is not None or end is not None:
            if start is None or end is None:
                raise ApiError(400, "invalid_input", "Give both start and end years.")
            if start < first or end > LAST_YEAR:
                raise ApiError(400, "invalid_input", f"For this variable the years must be between {first} and {LAST_YEAR}.")
            if end - start + 1 < MIN_YEARS:
                raise ApiError(400, "invalid_input", f"A trend needs at least {MIN_YEARS} years. Pick an earlier start or a later end.")
            period = end - start + 1
        else:
            if period not in self.periods:
                raise ApiError(400, "invalid_input", f"period must be one of {self.periods}.")
            if period == LONGER and variable in GRID_VARS:
                raise ApiError(400, "invalid_input", "Satellite and aerosol data start in 2001 or 2005; only NASA POWER weather goes back to 1981.")
            end = LAST_YEAR
        key = f"{code}|{variable}|{period if end == LAST_YEAR else f'{end - period + 1}-{end}'}|{self.version}"
        stored = self.store.get_region(key)
        if stored is not None:
            return stored
        try:
            body = self.build(code, variable, period) if end == LAST_YEAR else self.build(code, variable, period, end)
        except requests.RequestException:
            raise ApiError(502, "upstream_unavailable", "NASA POWER didn't answer. Try again in a minute.")
        if body["factor"].get("available"):
            self.store.put_region(key, {"code": code, "variable": variable, "period": period, "version": self.version}, body)
        return body


class EventService:
    def __init__(self, events, locate, states=None):
        self.events, self.locate, self.states = events, locate, states

    def list(self, region=None, lat=None, lon=None, start=None, end=None, variable=None):
        if region is None and lat is not None and lon is not None:
            region = self.locate(lat, lon)
        region = region.upper() if region else None
        if region and self.states is not None and region not in self.states:     # like /regions/{code}: not found
            raise ApiError(404, "not_found", f"No US state or territory with the code {region}.")
        out = [e for e in self.events
               if (region is None or region in e["states"])
               and (start is None or int(e["end"][:4]) >= start)
               and (end is None or int(e["start"][:4]) <= end)
               and (variable is None or variable in e["variables"])]
        return {"region": region, "events": sorted(out, key=lambda e: e["start"])}
