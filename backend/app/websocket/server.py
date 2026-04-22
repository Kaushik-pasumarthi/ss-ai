import logging
import asyncio
import socketio
from app.core.config import settings
from app.core.security import decode_token

logger = logging.getLogger(__name__)

# Create AsyncServer with Redis pub/sub manager for multi-process support
try:
    mgr = socketio.AsyncRedisManager(settings.redis_url)
    sio = socketio.AsyncServer(
        async_mode="asgi",
        client_manager=mgr,
        cors_allowed_origins="*",
    )
except Exception:
    # Fallback: no external manager (single-process / test env)
    sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# ASGI app to mount on FastAPI
socket_app = socketio.ASGIApp(sio, socketio_path="/ws")


async def _heartbeat(sid: str):
    """Send a ping every 30 seconds until the client disconnects."""
    try:
        while True:
            await asyncio.sleep(30)
            await sio.emit("heartbeat", {"ts": asyncio.get_event_loop().time()}, to=sid)
    except asyncio.CancelledError:
        pass
    except Exception:
        pass


@sio.event
async def connect(sid, environ, auth):
    """Validate JWT, join org/user rooms, start heartbeat."""
    token = None

    # auth dict from Socket.IO client auth payload
    if isinstance(auth, dict):
        token = auth.get("token")

    # Fallback: query string ?auth=<token>
    if not token:
        query_string = environ.get("QUERY_STRING", "")
        for part in query_string.split("&"):
            if part.startswith("auth="):
                token = part[5:]
                break

    if not token:
        logger.warning("[WS] Connection rejected — no token (sid=%s)", sid)
        return False  # reject

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        user_id = payload.get("sub")
        org_id = payload.get("org_id")

        await sio.save_session(sid, {"user_id": user_id, "org_id": org_id})

        if org_id:
            await sio.enter_room(sid, f"org:{org_id}")
        if user_id:
            await sio.enter_room(sid, f"user:{user_id}")

        # Start heartbeat task
        task = asyncio.ensure_future(_heartbeat(sid))
        await sio.save_session(sid, {"user_id": user_id, "org_id": org_id, "_heartbeat_task": None})
        # Store task reference in a module-level dict since session can't hold coroutines
        _heartbeat_tasks[sid] = task

        logger.info("[WS] Connected sid=%s user=%s org=%s", sid, user_id, org_id)
    except Exception as exc:
        logger.warning("[WS] Connection rejected — invalid token (sid=%s): %s", sid, exc)
        return False


@sio.event
async def disconnect(sid):
    """Cancel heartbeat and clean up."""
    task = _heartbeat_tasks.pop(sid, None)
    if task:
        task.cancel()
    logger.info("[WS] Disconnected sid=%s", sid)


# Module-level dict to track heartbeat tasks per sid
_heartbeat_tasks: dict = {}
