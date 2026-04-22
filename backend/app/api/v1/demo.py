import uuid
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import hash_password, create_access_token, create_refresh_token
from app.models.refresh_token import store_refresh_token
from app.core.security import hash_refresh_token
from app.models.models import Organization, Asset, Incident, ScanJob, User
from app.schemas.schemas import DemoSeedResponse, TokenResponse

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/bootstrap", tags=["demo"])
def bootstrap(db: Session = Depends(get_db)):
    """Create a demo admin user + org and return a JWT token. No auth required."""
    # Create or get demo org
    org = db.query(Organization).filter(Organization.name == "Demo Organization").first()
    if not org:
        org = Organization(name="Demo Organization")
        db.add(org)
        db.flush()

    # Create or get demo admin user
    user = db.query(User).filter(User.email == "admin@sportshield.ai").first()
    if not user:
        user = User(
            email="admin@sportshield.ai",
            hashed_password=hash_password("admin123"),
            role="Admin",
            organization_id=org.id,
        )
        db.add(user)
        db.flush()

    db.commit()

    token_data = {"sub": str(user.id), "role": user.role, "org_id": str(user.organization_id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    store_refresh_token(str(user.id), hash_refresh_token(refresh_token))

    return {
        "message": "Bootstrap complete",
        "email": "admin@sportshield.ai",
        "password": "admin123",
        "organization_id": str(org.id),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

SOURCE_TYPES = ["youtube", "website", "social_media"]
GEO_COUNTRIES = [
    "US", "GB", "DE", "FR", "BR", "IN", "CN", "JP", "AU", "CA",
    "MX", "RU", "ZA", "NG", "KR", "IT", "ES", "AR", "PL", "NL",
]
DEMO_ORG_NAME = "Demo Organization"
DEMO_ASSET_TITLE = "Demo Asset"


@router.post("/seed", response_model=DemoSeedResponse, status_code=201)
def seed_demo(
    current_user: User = Depends(require_role("Admin")),
    db: Session = Depends(get_db),
):
    # Ensure demo org exists
    org = db.query(Organization).filter(Organization.name == DEMO_ORG_NAME).first()
    assets_created = 0
    if not org:
        org = Organization(name=DEMO_ORG_NAME)
        db.add(org)
        db.flush()

    # Ensure demo asset exists
    asset = db.query(Asset).filter(
        Asset.organization_id == org.id,
        Asset.title == DEMO_ASSET_TITLE,
    ).first()
    if not asset:
        asset = Asset(
            organization_id=org.id,
            title=DEMO_ASSET_TITLE,
            asset_type="video",
            file_path="/demo/demo_asset.mp4",
            file_size_bytes=1024 * 1024,
            mime_type="video/mp4",
            status="registered",
            fingerprint_hash="demo_fingerprint_hash",
            created_by=current_user.id,
        )
        db.add(asset)
        db.flush()
        assets_created = 1

    now = datetime.utcnow()
    incidents_created = 0

    for i in range(50):
        days_ago = random.uniform(0, 30)
        detected_at = now - timedelta(days=days_ago)
        source_type = random.choice(SOURCE_TYPES)
        match_score = round(random.uniform(0.75, 0.99), 4)

        job = ScanJob(
            source_type=source_type,
            source_url=f"https://example-{source_type}.com/video/{uuid.uuid4().hex[:8]}",
            status="completed",
            dispatched_at=detected_at,
            completed_at=detected_at + timedelta(seconds=random.randint(1, 10)),
            latency_ms=random.randint(200, 3000),
        )
        db.add(job)
        db.flush()

        incident = Incident(
            scan_job_id=job.id,
            asset_id=asset.id,
            organization_id=org.id,
            source_url=job.source_url,
            source_type=source_type,
            match_score=match_score,
            detection_timestamp=detected_at,
            geo_country=random.choice(GEO_COUNTRIES),
            resolution_status=random.choice(["Open", "Under_Review", "Resolved", "Dismissed"]),
            perceptual_hash_score=round(random.uniform(0.7, 1.0), 4),
            embedding_score=match_score,
            keyframe_match_count=random.randint(1, 10),
            tampering_flags={
                "crop": random.choice([True, False]),
                "resize": random.choice([True, False]),
                "watermark": random.choice([True, False]),
                "recompression": True,
                "color_edit": random.choice([True, False]),
            },
        )
        db.add(incident)
        incidents_created += 1

    db.commit()
    return DemoSeedResponse(
        incidents_created=incidents_created,
        assets_created=assets_created,
        message=f"Demo data seeded: {incidents_created} incidents, {assets_created} assets created.",
    )


@router.post("/trigger")
async def trigger_demo(
    current_user: User = Depends(require_role("Admin")),
):
    from app.websocket.events import emit_demo_step

    steps = [
        (1, "Asset uploaded and fingerprinted", {"asset_id": str(uuid.uuid4())}),
        (2, "Scan job dispatched", {"job_id": str(uuid.uuid4())}),
        (3, "Suspicious content detected", {"match_score": 0.94, "source_type": "youtube"}),
        (4, "Incident created", {"incident_id": str(uuid.uuid4()), "geo_country": "US"}),
        (5, "Takedown action initiated", {"takedown_id": str(uuid.uuid4()), "status": "Draft"}),
    ]

    for step, description, data in steps:
        await emit_demo_step(step, description, data)

    return {"message": "Demo sequence triggered", "steps": len(steps)}
