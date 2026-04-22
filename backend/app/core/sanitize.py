from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class SanitizeMiddleware(BaseHTTPMiddleware):
    """Middleware placeholder — actual sanitization done at schema/service layer."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        return response
