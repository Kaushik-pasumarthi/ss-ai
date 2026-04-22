import hashlib
import hmac
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import WebhookEvent, Incident, Asset

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


def _verify_hmac(body: bytes, signature_header: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        settings.webhook_secret.encode(), body, digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@router.post("/ingest", status_code=202)
async def ingest_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None),
    db: Session = Depends(get_db),
):
    body = await request.body()

    if not _verify_hmac(body, x_hub_signature_256 or ""):
        logger.warning(
            "Invalid webhook signature from %s",
            request.client.host if request.client else "unknown",
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    # Resolve optional linked IDs from payload
    linked_incident_id = None
    linked_asset_id = None

    raw_incident_id = payload.get("incident_id")
    raw_asset_id = payload.get("asset_id")

    if raw_incident_id:
        try:
            iid = uuid.UUID(str(raw_incident_id))
            if db.query(Incident).filter(Incident.id == iid).first():
                linked_incident_id = iid
        except (ValueError, AttributeError):
            pass

    if raw_asset_id:
        try:
            aid = uuid.UUID(str(raw_asset_id))
            if db.query(Asset).filter(Asset.id == aid).first():
                linked_asset_id = aid
        except (ValueError, AttributeError):
            pass

    event = WebhookEvent(
        source_platform=payload.get("source_platform", "unknown"),
        payload=payload,
        signature_valid=True,
        received_at=datetime.utcnow(),
        linked_incident_id=linked_incident_id,
        linked_asset_id=linked_asset_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return {"event_id": str(event.id), "status": "accepted"}
