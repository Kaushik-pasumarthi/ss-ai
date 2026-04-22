import csv
import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.deps import get_current_user_dep
from app.models.models import Incident, Asset, ScanJob, User
from app.schemas.schemas import IncidentResponse, AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _build_incident_query(
    db: Session,
    current_user: User,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
    source_type: Optional[str],
    min_score: Optional[float],
    max_score: Optional[float],
    asset_name: Optional[str],
    resolution_status: Optional[str],
):
    query = db.query(Incident)
    if current_user.role != "Admin":
        query = query.filter(Incident.organization_id == current_user.organization_id)
    if date_from:
        query = query.filter(Incident.detection_timestamp >= date_from)
    if date_to:
        query = query.filter(Incident.detection_timestamp <= date_to)
    if source_type:
        query = query.filter(Incident.source_type == source_type)
    if min_score is not None:
        query = query.filter(Incident.match_score >= min_score)
    if max_score is not None:
        query = query.filter(Incident.match_score <= max_score)
    if asset_name:
        query = query.join(Asset, Incident.asset_id == Asset.id).filter(Asset.title.ilike(f"%{asset_name}%"))
    if resolution_status:
        query = query.filter(Incident.resolution_status == resolution_status)
    return query


@router.get("/incidents", response_model=list[IncidentResponse])
def analytics_incidents(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    source_type: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None, ge=0.0, le=1.0),
    max_score: Optional[float] = Query(None, ge=0.0, le=1.0),
    asset_name: Optional[str] = Query(None),
    resolution_status: Optional[str] = Query(None),
    sort_by: str = Query("detection_timestamp"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    query = _build_incident_query(
        db, current_user, date_from, date_to, source_type, min_score, max_score, asset_name, resolution_status
    )

    sortable = {
        "detection_timestamp", "match_score", "source_type", "resolution_status", "geo_country"
    }
    col = getattr(Incident, sort_by, None) if sort_by in sortable else Incident.detection_timestamp
    query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())

    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size).all()


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    asset_q = db.query(func.count(Asset.id))
    incident_q = db.query(func.count(Incident.id))
    active_q = db.query(func.count(Incident.id)).filter(Incident.resolution_status == "Open")
    scan_q = db.query(func.count(ScanJob.id))

    if current_user.role != "Admin":
        asset_q = asset_q.filter(Asset.organization_id == current_user.organization_id)
        incident_q = incident_q.filter(Incident.organization_id == current_user.organization_id)
        active_q = active_q.filter(Incident.organization_id == current_user.organization_id)

    total_assets = asset_q.scalar() or 0
    total_incidents = incident_q.scalar() or 0
    active_threats = active_q.scalar() or 0
    total_scans = scan_q.scalar() or 0
    # scan_frequency: scans per day over all time (approximate)
    scan_frequency = round(total_scans / 30.0, 2)

    return AnalyticsSummary(
        total_assets=total_assets,
        total_incidents=total_incidents,
        active_threats=active_threats,
        scan_frequency=scan_frequency,
    )


@router.get("/export/csv")
def export_csv(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    source_type: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    asset_name: Optional[str] = Query(None),
    resolution_status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    incidents = _build_incident_query(
        db, current_user, date_from, date_to, source_type, min_score, max_score, asset_name, resolution_status
    ).all()

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "asset_id", "source_url", "source_type", "match_score",
            "detection_timestamp", "geo_country", "resolution_status",
        ])
        yield buf.getvalue()
        for inc in incidents:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                str(inc.id), str(inc.asset_id), inc.source_url, inc.source_type,
                inc.match_score, inc.detection_timestamp.isoformat(),
                inc.geo_country or "", inc.resolution_status,
            ])
            yield buf.getvalue()

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=incidents.csv"},
    )


@router.get("/export/pdf")
def export_pdf(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    source_type: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    asset_name: Optional[str] = Query(None),
    resolution_status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    incidents = _build_incident_query(
        db, current_user, date_from, date_to, source_type, min_score, max_score, asset_name, resolution_status
    ).limit(500).all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("SportShield AI — Incident Report", styles["Title"]))
    elements.append(Paragraph(f"Generated: {datetime.utcnow().isoformat()}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    headers = ["ID (short)", "Source Type", "Match Score", "Status", "Country", "Detected"]
    data = [headers]
    for inc in incidents:
        data.append([
            str(inc.id)[:8],
            inc.source_type,
            f"{inc.match_score:.2%}",
            inc.resolution_status,
            inc.geo_country or "—",
            inc.detection_timestamp.strftime("%Y-%m-%d"),
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
    ]))
    elements.append(table)
    doc.build(elements)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=incidents_report.pdf"},
    )
