from typing import Literal

from fastapi import APIRouter, Depends

from backend.api.deps import services
from backend.api.v1.errors import NOT_FOUND
from backend.schemas import MapFrames, TrendField

router = APIRouter(prefix="/maps", tags=["maps"])
Factor = Literal["pm25", "no2", "fires", "smoke_days", "aod"]


@router.get("/{factor}/frames", response_model=MapFrames, responses=NOT_FOUND)
def map_frames(factor: Factor, s=Depends(services)):
    """Every grid cell's value for each year on one colour scale, so the map can play through time. Display data:
    the trend tests are on /maps/{factor} (built by `python -m tools.map_frames`)."""
    return s.maps.frames(factor)


@router.get("/{factor}", response_model=TrendField, response_model_exclude_unset=True, responses=NOT_FOUND)
def trend_field(factor: Factor, s=Depends(services)):
    """Trend per NASA grid cell over the lower 48 (built by `python -m tools.trend_field`)."""
    return s.maps.trend_field(factor)
