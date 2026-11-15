from backend.schemas import ErrorOut

# The error responses a route can return, for the OpenAPI document.
ERRORS = {400: {"model": ErrorOut}, 422: {"model": ErrorOut}, 502: {"model": ErrorOut}}
NOT_FOUND = {404: {"model": ErrorOut}}
