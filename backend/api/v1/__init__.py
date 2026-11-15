"""/api/v1: HTTP only. Each route parses input, calls one service and declares its response model."""
from fastapi import APIRouter

from backend.api.v1 import maps, meta, patterns, places, regions, reports, weekly

router = APIRouter()
for module in (meta, reports, places, maps, regions, weekly, patterns):
    router.include_router(module.router)
