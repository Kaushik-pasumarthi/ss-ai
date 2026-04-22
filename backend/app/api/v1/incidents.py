import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user_dep
from app.models.models import Incident, Asset, User
from app.schemas.schemas import IncidentResponse, IncidentStatusUpdate

router = APIRouter(prefix="/incidents", tags=["incidents"])

VALID_STATUSES = {"Open", "Under_Review", "Resolved", "Dismissed"}


@router.get("/", response_model=list[IncidentResponse])
def list_incidents(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    query = db.query(Incident)
    if current_user.role != "Admin":
        query = query.filter(Incident.organization_id == current_user.organization_id)
    offset = (page - 1) * page_size
    return query.order_by(Incident.detection_timestamp.desc()).offset(offset).limit(page_size).all()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role != "Admin" and incident.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions for this resource")
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: uuid.UUID,
    body: IncidentStatusUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    if body.resolution_status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role != "Admin" and incident.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions for this resource")
    incident.resolution_previous_status = incident.resolution_status
    incident.resolution_status = body.resolution_status
    incident.resolution_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return incident
