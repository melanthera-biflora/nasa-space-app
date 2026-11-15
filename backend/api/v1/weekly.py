from fastapi import APIRouter, Depends, Query

from backend.api.deps import services
from backend.api.v1.errors import ERRORS, NOT_FOUND
from backend.schemas import Weekly

router = APIRouter(tags=["weekly"])


@router.get("/weekly", response_model=Weekly, responses={**ERRORS, **NOT_FOUND})
def weekly(lat: float = Query(ge=18, le=72), lon: float = Query(ge=-180, le=-65), variable: str = "t2m_max",
           year: int = 2025, period: int = 25, s=Depends(services)):
    """One year at a US point as 52 fixed 7-day weeks from 1 January, each with its usual range (10th-90th percentile)
    over the period. A view for heat waves, cold snaps and wet weeks; not a trend test."""
    return s.weekly.get(lat, lon, variable, year, period)
