"""Climatch local API.

Run from the repo root:
    .venv/Scripts/python -m uvicorn backend.app:app --reload --port 8000
Docs: http://localhost:8000/api/v1/docs. The frontend dev server proxies /api to it.
"""
import logging
import re
from urllib.parse import unquote_plus

from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware

from backend.api.v1 import router as v1
from backend.errors import install_error_handlers
from backend.services import make_services


_HOUSEHOLD = {"conditions", "age_groups"}


def _redact(target):
    """Hide household values in a request target, reading each query key the way the API would (percent-decoded), so
    `%63onditions=` is hidden too. The app sends the household in a POST body (D38); this guards any other client."""
    path, sep, query = target.partition("?")
    if not sep:
        return target
    parts = []
    for part in query.split("&"):
        key = unquote_plus(part.partition("=")[0]).strip().lower()
        parts.append(f"{key}=[hidden]" if key in _HOUSEHOLD else part)
    return f"{path}?{'&'.join(parts)}"


class RedactHousehold(logging.Filter):
    """Access-log lines keep the place and period but never the household's conditions or ages (SPEC A3, D25)."""
    def filter(self, record):
        if isinstance(record.args, tuple) and len(record.args) >= 3 and isinstance(record.args[2], str):
            args = list(record.args)
            args[2] = _redact(args[2])
            record.args = tuple(args)
        return True


logging.getLogger("uvicorn.access").addFilter(RedactHousehold())


# Files built once by the pipeline (maps, the 51-city table, outlines, the curated events): the browser may reuse them
# for 5 minutes and show a stale copy while it checks again for a day. Per-place answers (reports, series, patterns)
# are not marked: the app's own memory cache covers a visit, and an incomplete answer must not stick.
_BUILT = re.compile(r"^/api/v1/(maps/[a-z0-9_]+(/frames)?|places/compare|regions|regions/[A-Za-z0-9]+/outline|demos|events)$")
BUILT_CACHE = "public, max-age=300, stale-while-revalidate=86400"


async def _cache_built(request: Request, call_next):
    response = await call_next(request)
    if request.method == "GET" and response.status_code == 200 and _BUILT.match(request.url.path):
        response.headers["Cache-Control"] = BUILT_CACHE
    return response


def create_app(services=None):
    app = FastAPI(title="Climatch API", version="1.0.0", docs_url="/api/v1/docs",
                  openapi_url="/api/v1/openapi.json", redoc_url=None)
    app.state.services = services or make_services()
    install_error_handlers(app)
    # JSON shrinks 7-8x (the PM2.5 frames 737 KB -> 99 KB, the 51-city table 211 KB -> 29 KB): what matters most when
    # the instance or the network is slow. Under 1 KB isn't worth the work.
    app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)
    app.middleware("http")(_cache_built)
    app.include_router(v1, prefix="/api/v1")
    return app


app = create_app()
