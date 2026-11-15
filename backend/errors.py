"""One error shape for every failure: {"error": {"code", "message"}}. Messages are plain sentences, never internals."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("climatch")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def _body(status, code, message):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


_FIELD_WORDS = {   # plain sentences for the fields people can get wrong (L10); the browser shows them as they are
    "lat": "Pick a place in the United States.", "lon": "Pick a place in the United States.",
    "period": "Pick a period of 10, 15, 20 or 25 years.", "start": "Pick a period of years from 2001 to 2025.",
    "end": "Pick a period of years from 2001 to 2025.", "year": "Pick a year from 2001 to 2025.",
    "region": "Use a two-letter US state code, like WI.",
    "factor": "That record isn't one we have.", "variable": "That record isn't one we have.",
    "a": "That record isn't one we have.", "b": "That record isn't one we have.",
    "conditions": "Those health answers aren't ones we know.", "age_groups": "Those age groups aren't ones we know.",
    "q": "Type 3 to 200 characters.",
}


def _plain(err):
    """A plain sentence for a Pydantic validation error ("Pick a place in the United States."), never validator text."""
    field = next((str(p) for p in reversed(err.get("loc", ())) if isinstance(p, str) and p not in ("query", "path", "body")), "")
    return _FIELD_WORDS.get(field, "Something in this request isn't valid. Check the link and try again.")


def install_error_handlers(app: FastAPI):
    @app.exception_handler(ApiError)
    async def api_error(_: Request, exc: ApiError):
        return _body(exc.status, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def invalid(_: Request, exc: RequestValidationError):
        errors = exc.errors()
        return _body(422, "invalid_input", _plain(errors[0]) if errors else "The request isn't valid.")

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        code = "not_found" if exc.status_code == 404 else "http_error"
        return _body(exc.status_code, code, "There's nothing at this address." if exc.status_code == 404 else str(exc.detail))

    @app.exception_handler(Exception)
    async def crash(_: Request, exc: Exception):
        log.exception("unhandled error")                # the details go to the server log, not the browser
        return _body(500, "internal", "Something went wrong on our side. Try again.")
