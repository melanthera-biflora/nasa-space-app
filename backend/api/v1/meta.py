from fastapi import APIRouter, Depends

from backend.api.deps import services
from backend.schemas import Demo, Health

router = APIRouter(tags=["meta"])


@router.get("/health", response_model=Health)
def health(s=Depends(services)):
    return {"ok": True, "store": s.store.name}


@router.get("/demos", response_model=list[Demo])
def demos(s=Depends(services)):
    """The demo cities and their household presets."""
    return s.maps.demos()
