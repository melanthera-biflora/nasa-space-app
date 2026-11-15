from fastapi import APIRouter, Depends, Query

from backend.api.deps import services
from backend.api.v1.errors import ERRORS, NOT_FOUND
from backend.schemas import EventList, RegionList, RegionOutline, RegionSeries

router = APIRouter(tags=["regions"])


@router.get("/regions", response_model=RegionList)
def regions(s=Depends(services)):
    """US states (with DC and Puerto Rico), the variables a state can be averaged for, and the allowed periods."""
    return s.regions.list()


@router.get("/regions/{code}/outline", response_model=RegionOutline, responses=NOT_FOUND)
def region_outline(code: str, s=Depends(services)):
    """A state's outline, to draw it on a map when someone picks the whole state."""
    return s.regions.outline(code)


@router.get("/regions/{code}/series", response_model=RegionSeries, response_model_exclude_unset=True,
            responses={**ERRORS, **NOT_FOUND})
def region_series(code: str, variable: str = "t2m", period: int = 25, start: int | None = None, end: int | None = None,
                  s=Depends(services)):
    """One variable averaged over a state, as a report card with the yearly and seasonal tests. NASA POWER weather
    is fetched live the first time (about 1-5 s), then stored."""
    return s.regions.series(code, variable, period, start, end)


@router.get("/events", response_model=EventList, responses=ERRORS)
def events(region: str | None = Query(None, min_length=2, max_length=2),
           lat: float | None = Query(None, ge=18, le=72), lon: float | None = Query(None, ge=-180, le=-65),
           start: int | None = Query(None, ge=1981, le=2100), end: int | None = Query(None, ge=1981, le=2100),
           variable: str | None = None, s=Depends(services)):
    """Curated, sourced US events (smoke, heat, cold, rain, drought, fire) for a state or the state of a point."""
    return s.events.list(region, lat, lon, start, end, variable)
