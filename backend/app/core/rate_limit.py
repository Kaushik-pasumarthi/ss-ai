import time
import redis as redis_lib
from fastapi import HTTPException, Request
from app.core.config import settings

_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            url = settings.redis_url
            if url.startswith("rediss://"):
                _redis_client = redis_lib.from_url(url, decode_responses=True, ssl_cert_reqs=None, socket_connect_timeout=2)
            else:
                _redis_client = redis_lib.from_url(url, decode_responses=True, socket_connect_timeout=2)
        except Exception:
            return None
    return _redis_client


def rate_limit(limit: int = None, window: int = 60):
    """FastAPI dependency factory for rate limiting."""
    effective_limit = limit or settings.rate_limit_default

    async def checker(request: Request):
        r = get_redis()
        if r is None:
            return  # Skip rate limiting if Redis unavailable
        # Use user ID from JWT if available, else IP
        auth = request.headers.get("authorization", "")
        key_id = request.client.host
        if auth.startswith("Bearer "):
            key_id = auth.split(" ", 1)[1][:32]  # use token prefix as key

        key = f"rate:{key_id}:{request.url.path}"
        now = int(time.time())
        window_start = now - window

        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now) + str(id(request)): now})
        pipe.zcard(key)
        pipe.expire(key, window)
        results = pipe.execute()
        count = results[2]

        if count > effective_limit:
            retry_after = window - (now % window)
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(retry_after)},
            )

    return checker


def sanitize_string(value: str) -> str:
    """Strip null bytes and leading/trailing whitespace."""
    return value.replace("\x00", "").strip()
