import logging

logger = logging.getLogger(__name__)


def _get_sio():
    """Lazy import to avoid circular imports at module load time."""
    try:
        from app.websocket.server import sio
        return sio
    except Exception:
        return None


async def emit_incident_created(incident_id: str, asset_id: str, match_score: float, source_type: str, timestamp: str):
    sio = _get_sio()
    event = {
        "incident_id": incident_id,
        "asset_id": asset_id,
        "match_score": match_score,
        "source_type": source_type,
        "timestamp": timestamp,
    }
    logger.info("[WS] incident.created: %s score=%.4f", incident_id, match_score)
    if sio:
        try:
            await sio.emit("incident.created", event)
        except Exception as exc:
            logger.warning("[WS] emit failed: %s", exc)


async def emit_asset_registered(asset_id: str, title: str, status: str):
    sio = _get_sio()
    event = {"asset_id": asset_id, "title": title, "status": status}
    logger.info("[WS] asset.registered: %s status=%s", asset_id, status)
    if sio:
        try:
            await sio.emit("asset.registered", event)
        except Exception as exc:
            logger.warning("[WS] emit failed: %s", exc)


async def emit_scan_job_completed(job_id: str, status: str, incident_id: str = None):
    sio = _get_sio()
    event = {"job_id": job_id, "status": status, "incident_id": incident_id}
    logger.info("[WS] scan.job.completed: %s status=%s", job_id, status)
    if sio:
        try:
            await sio.emit("scan.job.completed", event)
        except Exception as exc:
            logger.warning("[WS] emit failed: %s", exc)


async def emit_metrics_updated(latency_ms: float, precision: float, recall: float):
    sio = _get_sio()
    event = {"latency_ms": latency_ms, "precision": precision, "recall": recall}
    logger.info("[WS] metrics.updated: latency=%.2fms", latency_ms)
    if sio:
        try:
            await sio.emit("metrics.updated", event)
        except Exception as exc:
            logger.warning("[WS] emit failed: %s", exc)


async def emit_demo_step(step: int, description: str, data: dict):
    sio = _get_sio()
    event = {"step": step, "description": description, "data": data}
    logger.info("[WS] demo.step: %d - %s", step, description)
    if sio:
        try:
            await sio.emit("demo.step", event)
        except Exception as exc:
            logger.warning("[WS] emit failed: %s", exc)
