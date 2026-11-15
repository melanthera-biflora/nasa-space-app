"""Places: the full address search (Nominatim, Search button), suggestions while typing (Photon), and the name of a
spot picked on the map (Photon reverse)."""
import re
import threading
import time

import requests

from backend.errors import ApiError

USER_AGENT = "Climatch-SpaceApps2026-demo/0.1"   # both services ask apps to identify themselves
PHOTON = "https://photon.komoot.io"
US_MIDDLE = {"lat": 39.5, "lon": -98.35}          # bias towards the US when names are shared abroad
ZIP = re.compile(r"^(\d{3,5})(-\d{0,4})?$")      # 3-5 digits, optionally ZIP+4: look it up as a ZIP code
SUGGEST_FORMAT = "v3"                              # in the cache key: a new ranking or shape never reuses old rows

# What an OpenStreetMap place is to someone looking for a home, and how early to list it (lower first).
PLACE_KIND = {"state": ("State", 0), "city": ("City", 1), "town": ("Town", 1), "postcode": ("ZIP code", 1),
              "village": ("Village", 2), "county": ("County", 2),
              "suburb": ("Neighborhood", 3), "neighbourhood": ("Neighborhood", 3), "quarter": ("Neighborhood", 3),
              "borough": ("Neighborhood", 3),
              "hamlet": ("Small place", 4), "isolated_dwelling": ("Small place", 4), "locality": ("Small place", 4)}
# OpenStreetMap keys of things people visit rather than live at: shops, schools, offices, stations...
VISITED = {"amenity", "shop", "office", "leisure", "tourism", "craft", "club", "historic", "man_made", "railway",
           "aeroway", "emergency", "healthcare", "public_transport", "sport", "natural"}


def classify(p, q):
    """(kind, order) for one Photon result: what a home-seeker would call it, and how early it is listed."""
    if p.get("osm_key") == "place" and p.get("osm_value") in PLACE_KIND:
        return PLACE_KIND[p["osm_value"]]
    typ = p.get("type")
    if typ == "state":
        return "State", 0
    if typ == "city":
        return "City", 1                     # an administrative city or township boundary
    if typ == "county":
        return "County", 2
    if typ == "house" and p.get("housenumber") and p.get("osm_key") not in VISITED:
        typed = q.split(" ", 1)[0] if q[:1].isdigit() else None
        return "Address", 1 if typed and p["housenumber"] == typed else 3    # "1600 penn..." wants number 1600 first
    if typ == "street":
        return "Street", 3
    if typ in ("district", "locality"):
        return "Small place", 4
    return "Landmark", 5                     # shops, schools, stations: not where someone lives


def describe(p, kind, abbr):
    """Main text, second line and the full name for the box, e.g. ('Spokane', 'WA', 'Spokane, WA')."""
    name = p.get("name") or ""
    if kind == "County" and not name.endswith("County"):
        name += " County"
    street = " ".join(x for x in (p.get("housenumber"), p.get("street")) if x)
    main = street if kind == "Address" and p.get("name") in (None, p.get("housenumber")) else name
    state = p.get("state")
    county = p.get("county") if kind not in ("County", "State") else None
    town = p.get("city") or p.get("town") or p.get("village") or (county if not county or county.endswith("County") else f"{county} County")
    if kind == "State":
        rest = "United States"
    elif town and town != main:
        rest = ", ".join(x for x in ((street if street and street != main else None), town, abbr.get(state, state)) if x)
    else:
        rest = ", ".join(x for x in ((street if street and street != main else None), state) if x)
    full = main if kind == "State" else ", ".join(x for x in (main, rest) if x)
    return main, rest, full


def rank(features, q, abbr, limit=6):
    """Photon results -> suggestions for a home search: US only; states, cities and ZIP codes first; tiny hamlets and
    landmarks only when nothing better matched (typing 'Texas' shouldn't offer a hamlet in New York); one per place."""
    rows = []
    for i, f in enumerate(features):
        p = f.get("properties", {})
        lon, lat = (f.get("geometry", {}).get("coordinates") or [None, None])[:2]
        if p.get("countrycode", "").upper() != "US" or lat is None or not p.get("name"):
            continue
        kind, order = classify(p, q)
        rows.append((order, i, kind, p, lat, lon))
    strong = sum(r[0] <= 2 for r in rows)
    rows = [r for r in rows if r[0] <= 3 or (r[0] == 4 and strong < 2) or (r[0] == 5 and not any(x[0] <= 3 for x in rows))]
    seen, out = set(), []
    for order, _, kind, p, lat, lon in sorted(rows, key=lambda r: (r[0], r[1])):
        main, rest, full = describe(p, kind, abbr)
        spot = (round(lat, 2), round(lon, 2))       # a shop named "Spokane" at the city's centre adds nothing
        if full in seen or spot in seen:
            continue
        seen.update((full, spot))
        w, n, e, s = (p.get("extent") or [None] * 4)[:4]
        item = {"name": full, "main": main, "secondary": rest, "kind": kind, "lat": round(lat, 4), "lon": round(lon, 4)}
        if w is not None:
            item["extent"] = [round(w, 4), round(s, 4), round(e, 4), round(n, 4)]      # west, south, east, north
        if kind == "State" and abbr.get(p.get("name")):
            item["region"] = abbr[p["name"]]
        out.append(item)
        if len(out) == limit:
            break
    return out


class PlaceService:
    def __init__(self, store, http=requests, states=None):
        self.store, self.http = store, http
        if states is None:
            from sources.power_region import load_states
            states = load_states()
        self.abbr = {s["name"]: code for code, s in states.items()}      # "Washington" -> "WA"
        self._lock = threading.Lock()
        self._last = 0.0

    def search(self, q):
        q = " ".join(q.split())
        stored = self.store.get_places("geocode", q.lower())
        if stored is not None:
            return stored
        try:
            with self._lock:                                  # Nominatim policy: at most 1 request per second
                time.sleep(max(0.0, 1 - (time.time() - self._last)))
                r = self.http.get("https://nominatim.openstreetmap.org/search",
                                  params={"q": q, "format": "jsonv2", "countrycodes": "us", "limit": 5},
                                  headers={"User-Agent": USER_AGENT}, timeout=10)
                self._last = time.time()
            r.raise_for_status()
            places = [{"name": p["display_name"], "lat": float(p["lat"]), "lon": float(p["lon"])} for p in r.json()]
        except requests.RequestException:
            raise ApiError(502, "upstream_unavailable", "The address search didn't answer. Try again, or click the map.")
        self.store.put_places("geocode", q.lower(), places)
        return places

    def suggest(self, q):
        """Up to 6 US places for 3+ characters. Nominatim's usage policy forbids search-as-you-type, so this uses
        Photon (komoot's OpenStreetMap geocoder built for it; free, no key). Digits are looked up as ZIP codes."""
        q = " ".join(q.split()).lower()
        if len(q) < 3:
            return []
        key = f"{SUGGEST_FORMAT}|{q}"
        stored = self.store.get_places("suggest", key)
        if stored is not None:
            return stored
        zip_code = ZIP.match(q)
        params = ({"q": zip_code.group(1), "limit": 8, "osm_tag": "place:postcode"} if zip_code
                  else {"q": q, "limit": 15, "lang": "en"})
        try:
            r = self.http.get(f"{PHOTON}/api/", params={**params, **US_MIDDLE}, headers={"User-Agent": USER_AGENT}, timeout=5)
            r.raise_for_status()
            features = r.json().get("features", [])
        except requests.RequestException:
            raise ApiError(502, "upstream_unavailable", "Suggestions aren't available right now. Press Search instead.")
        out = rank(features, q, self.abbr)
        self.store.put_places("suggest", key, out)
        return out

    def reverse(self, lat, lon):
        """The place at a spot picked on the map (an address, street or town), or a plain 'Picked spot' name."""
        lat, lon = round(lat, 4), round(lon, 4)
        key = f"@{lat:.3f},{lon:.3f}"                      # stored with the geocode lookups; ~100 m is the same spot
        stored = self.store.get_places("geocode", key)
        if stored is not None:
            return stored[0]
        try:
            r = self.http.get(f"{PHOTON}/reverse", params={"lat": lat, "lon": lon, "lang": "en", "radius": 2},   # the nearest road within 2 km
                              headers={"User-Agent": USER_AGENT}, timeout=5)
            r.raise_for_status()
            features = r.json().get("features", [])
        except requests.RequestException:
            features = []                                  # naming the spot is a nicety: the pin still works
        p = features[0].get("properties", {}) if features else {}
        if p and p.get("countrycode", "").upper() != "US":
            raise ApiError(400, "invalid_input", "Pick a spot in the United States.")
        if p.get("housenumber") and p.get("street"):        # a home search wants the street address, not a building's name
            main, rest, full = describe({**p, "name": None}, "Address", self.abbr)
        elif p.get("name") or p.get("street") or p.get("city"):
            kind, _ = classify(p, "")
            main, rest, full = describe({**p, "name": p.get("name") or p.get("street") or p.get("city")}, kind, self.abbr)
        else:
            main, rest = "Picked spot", f"{abs(lat):.3f}° {'N' if lat >= 0 else 'S'}, {abs(lon):.3f}° W"
            full = f"Picked spot near {lat:.3f}, {lon:.3f}"
        place = {"name": full, "main": main, "secondary": rest, "kind": "Picked spot", "lat": lat, "lon": lon}
        if features:
            self.store.put_places("geocode", key, [place])
        return place
