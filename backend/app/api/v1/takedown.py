import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user_dep, require_role
from app.models.models import TakedownAction, Incident, User
from app.schemas.schemas import TakedownActionCreate, TakedownActionResponse, TakedownTransition


class SeverityUpdate(BaseModel):
    severity: str

router = APIRouter(prefix="/takedown", tags=["takedown"])

WORKFLOW = ["Draft", "Submitted", "Acknowledged", "Resolved"]
WRITE_ROLES = ("Compliance_Officer", "Admin")


def _next_status(current: str) -> str | None:
    try:
        idx = WORKFLOW.index(current)
        return WORKFLOW[idx + 1] if idx + 1 < len(WORKFLOW) else None
    except ValueError:
        return None


@router.post("/", response_model=TakedownActionResponse, status_code=201)
def create_takedown(
    body: TakedownActionCreate,
    current_user: User = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == body.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    dmca_text = (
        f"DMCA Takedown Notice\n\n"
        f"Incident ID: {incident.id}\n"
        f"Source URL: {incident.source_url}\n"
        f"Source Type: {incident.source_type}\n"
        f"Match Score: {incident.match_score:.2%}\n"
        f"Detection Date: {incident.detection_timestamp.isoformat()}\n"
        f"Geo Country: {incident.geo_country or 'Unknown'}\n\n"
        f"We hereby request immediate removal of the infringing content listed above."
    )

    action = TakedownAction(
        incident_id=body.incident_id,
        severity=body.severity,
        dmca_draft_text=dmca_text,
        requested_by=current_user.id,
        requested_at=datetime.utcnow(),
        status="Draft",
        status_history=[
            {"status": "Draft", "timestamp": datetime.utcnow().isoformat(), "user_id": str(current_user.id)}
        ],
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.get("/{takedown_id}", response_model=TakedownActionResponse)
def get_takedown(
    takedown_id: uuid.UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    action = db.query(TakedownAction).filter(TakedownAction.id == takedown_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Takedown action not found")
    return action


@router.post("/{takedown_id}/transition", response_model=TakedownActionResponse)
def transition_takedown(
    takedown_id: uuid.UUID,
    body: TakedownTransition,
    current_user: User = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    action = db.query(TakedownAction).filter(TakedownAction.id == takedown_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Takedown action not found")

    expected_next = _next_status(action.status)
    if body.new_status != expected_next:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid transition. Current status is '{action.status}', expected next is '{expected_next}'.",
        )

    action.status = body.new_status
    history = list(action.status_history or [])
    history.append({
        "status": body.new_status,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": str(current_user.id),
    })
    action.status_history = history
    db.commit()
    db.refresh(action)
    return action


@router.patch("/{takedown_id}/severity", response_model=TakedownActionResponse)
def update_severity(
    takedown_id: uuid.UUID,
    body: SeverityUpdate,
    current_user: User = Depends(require_role(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    valid_severities = {"Low", "Medium", "High", "Critical"}
    if body.severity not in valid_severities:
        raise HTTPException(status_code=422, detail=f"Invalid severity. Must be one of: {valid_severities}")
    action = db.query(TakedownAction).filter(TakedownAction.id == takedown_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Takedown action not found")
    action.severity = body.severity
    db.commit()
    db.refresh(action)
    return action
