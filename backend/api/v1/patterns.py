from fastapi import APIRouter, Depends, Query

from backend.api.deps import services
from backend.api.v1.errors import ERRORS, NOT_FOUND
from backend.errors import ApiError
from backend.schemas import PatternPair, Patterns

router = APIRouter(tags=["patterns"])


@router.get("/patterns", response_model=Patterns, responses={**ERRORS, **NOT_FOUND})
def patterns(lat: float | None = Query(None, ge=18, le=72), lon: float | None = Query(None, ge=-180, le=-65),
             region: str | None = Query(None, min_length=2, max_length=2), period: int = 25, s=Depends(services)):
    """How a place's variables move together (with lead times), signs that its ups and downs are changing, how often
    months pass the old top 10%, and compound extremes (hot and dry, hot and smoky). Describes the past; no forecast."""
    if period not in (10, 15, 20, 25, 45):
        raise ApiError(400, "invalid_input", "The period must be 10, 15, 20, 25 or 45 years.")
    if region:
        return s.patterns.for_state(region, period)
    if lat is None or lon is None:
        raise ApiError(400, "invalid_input", "Give a US point (lat and lon) or a state (region).")
    return s.patterns.for_point(lat, lon, period)


@router.get("/patterns/pair", response_model=PatternPair, responses={**ERRORS, **NOT_FOUND})
def pattern_pair(a: str = Query(..., max_length=40, pattern=r"^[a-z0-9_]+$"), b: str = Query(..., max_length=40, pattern=r"^[a-z0-9_]+$"),
                 lat: float | None = Query(None, ge=18, le=72), lon: float | None = Query(None, ge=-180, le=-65),
                 region: str | None = Query(None, min_length=2, max_length=2), s=Depends(services)):
    """The two records of one link as the test saw them (detrended calendar-month z, 3-month average), for drawing."""
    if region:
        return s.patterns.pair({"kind": "state", "code": region.upper()}, a, b)
    if lat is None or lon is None:
        raise ApiError(400, "invalid_input", "Give a US point (lat and lon) or a state (region).")
    return s.patterns.pair({"kind": "point", "lat": lat, "lon": lon}, a, b)
