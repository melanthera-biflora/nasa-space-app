from fastapi import APIRouter, Depends, Query

from backend.api.deps import services
from backend.api.v1.errors import ERRORS
from backend.schemas import Report, ReportRequest

router = APIRouter(tags=["reports"])


@router.get("/reports", response_model=Report, response_model_exclude_unset=True, responses=ERRORS)
def get_report(lat: float = Query(ge=18, le=72), lon: float = Query(ge=-180, le=-65),   # US incl. Alaska, Hawaii
               period: int = 25, start: int | None = None, end: int | None = None, s=Depends(services)):
    """The trend report for a US point with no household (period is 10, 15, 20 or 25 years, or any start-end of at least
    8 years within 2001-2025). Household keys in the address are ignored: send them with POST (D38)."""
    return s.reports.get(lat, lon, "none", "18_64", period, start, end)


@router.post("/reports", response_model=Report, response_model_exclude_unset=True, responses=ERRORS)
def post_report(body: ReportRequest, s=Depends(services)):
    """The trend report for a US point and household, with the household in the body. Reused from the store when the
    household-neutral report exists; the household only orders and flags the cards in the answer."""
    return s.reports.get(body.lat, body.lon, ",".join(body.conditions), ",".join(body.age_groups), body.period, body.start, body.end)
