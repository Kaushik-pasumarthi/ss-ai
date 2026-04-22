import uuid
import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user_dep, require_role
from app.models.models import ScanJob, User
from app.schemas.schemas import ScanJobResponse

router = APIRouter(prefix="/scan", tags=["scan"])

SOURCE_TYPES = ["youtube", "website", "social_media"]


@router.post("/trigger", response_model=ScanJobResponse, status_code=202)
def trigger_scan(
    source_url: str = "pending",
    source_type: str = None,
    current_user: User = Depends(require_role("Admin")),
    db: Session = Depends(get_db),
):
    job = ScanJob(
        source_type=source_type or random.choice(SOURCE_TYPES),
        source_url=source_url,
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        from app.worker.tasks import run_scan_job
        run_scan_job.delay(str(job.id))
    except Exception:
        pass

    return job


@router.get("/jobs", response_model=list[ScanJobResponse])
def list_scan_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    return (
        db.query(ScanJob)
        .order_by(ScanJob.dispatched_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )


@router.get("/jobs/{job_id}", response_model=ScanJobResponse)
def get_scan_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return job
