from fastapi import Request

from backend.services import Services


def services(request: Request) -> Services:
    return request.app.state.services
