"""Week by week for a point: computed from the cached NASA POWER daily file (fast), so nothing is stored."""
import requests

from backend.errors import ApiError


class WeeklyService:
    def __init__(self, build, variables, first_year=2001, last_year=2025):
        self.build, self.variables, self.first, self.last = build, variables, first_year, last_year

    def get(self, lat, lon, variable, year, period=25):
        if variable not in self.variables:
            raise ApiError(400, "invalid_input", f"variable must be one of {', '.join(self.variables)}.")
        if not self.first <= year <= self.last:
            raise ApiError(400, "invalid_input", f"year must be between {self.first} and {self.last}.")
        if period not in (10, 15, 20, 25):
            raise ApiError(400, "invalid_input", "period must be 10, 15, 20 or 25.")
        try:
            out = self.build(round(lat, 2), round(lon, 2), variable, year, period)
        except requests.RequestException:
            raise ApiError(502, "upstream_unavailable", "NASA POWER didn't answer. Try again in a minute.")
        if out is None:
            raise ApiError(404, "not_found", f"No daily data for {year} at this place.")
        return out
