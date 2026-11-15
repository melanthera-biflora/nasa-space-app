from fastapi import APIRouter, Depends, Query

from backend.api.deps import services
from backend.api.v1.errors import ERRORS, NOT_FOUND
from backend.schemas import CompareTable, Place, Suggestion

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/search", response_model=list[Place], responses=ERRORS)
def search(q: str = Query(min_length=2, max_length=200), s=Depends(services)):
    """Up to 5 US matches from OpenStreetMap Nominatim (1 request per second, stored)."""
    return s.places.search(q)


@router.get("/suggest", response_model=list[Suggestion], responses=ERRORS)
def suggest(q: str = Query(max_length=200), s=Depends(services)):
    """Up to 6 US suggestions while typing (3+ characters, else an empty list), from Photon."""
    return s.places.suggest(q)


@router.get("/reverse", response_model=Suggestion, responses=ERRORS)
def reverse(lat: float = Query(ge=18, le=72), lon: float = Query(ge=-180, le=-65), s=Depends(services)):
    """The place at a spot picked on the map (Photon reverse), or a plain "Picked spot" when it has no name."""
    return s.places.reverse(lat, lon)


@router.get("/compare", response_model=CompareTable, responses=NOT_FOUND)
def compare(s=Depends(services)):
    """Every factor of 51 US cities, for comparing places in the browser: level, then and now, rate, the city's own
    Mann-Kendall p and the Benjamini-Hochberg q across all cities (built by `python -m tools.compare_export`)."""
    return s.maps.compare_table()
