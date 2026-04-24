import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user_dep, require_role
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.models.models import Asset, Organization
from app.schemas.schemas import AssetResponse, AssetUploadResponse
from app.models.models import User

router = APIRouter(prefix="/assets", tags=["assets"])

SUPPORTED_EXTENSIONS = {
    "video": ["mp4", "mov", "avi"],
    "image": ["jpg", "jpeg", "png", "webp"],
    "logo": ["svg", "png"],
    "broadcast_clip": ["mp4", "mov"],
}
SUPPORTED_MIMES = {
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "image/jpeg", "image/png", "image/webp",
    "image/svg+xml",
}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


def detect_asset_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    for asset_type, exts in SUPPORTED_EXTENSIONS.items():
        if ext in exts:
            return asset_type
    return None


def validate_file(filename: str, content_type: str) -> tuple[str, str]:
    """Returns (asset_type, ext) or raises HTTPException."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    asset_type = detect_asset_type(filename)
    if not asset_type:
        raise HTTPException(status_code=422, detail="Unsupported file type. Accepted: mp4, mov, avi, jpg, png, webp, svg")
    return asset_type, ext


async def save_upload(file: UploadFile, dest_path: str) -> int:
    """Stream file to disk, counting bytes. Raises 422 if > MAX_FILE_SIZE."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    total = 0
    with open(dest_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_FILE_SIZE:
                f.close()
                os.remove(dest_path)
                raise HTTPException(status_code=422, detail="File exceeds 500 MB limit")
            f.write(chunk)
    return total


@router.post("/upload", response_model=AssetUploadResponse, status_code=202)
async def upload_asset(
    file: UploadFile = File(...),
    title: str = Form(...),
    organization_id: str = Form(None),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    asset_type, ext = validate_file(file.filename, file.content_type)
    asset_id = uuid.uuid4()
    # Always use the authenticated user's org — ignore any submitted org_id
    org_id = current_user.organization_id
    dest_path = os.path.join(settings.upload_dir, str(asset_id), file.filename)
    file_size = await save_upload(file, dest_path)

    asset = Asset(
        id=asset_id,
        organization_id=org_id,
        title=title,
        asset_type=asset_type,
        file_path=dest_path,
        file_size_bytes=file_size,
        mime_type=file.content_type,
        status="uploading",
        created_by=current_user.id,
    )
    db.add(asset)
    db.commit()

    # Dispatch Celery task
    try:
        from app.worker.tasks import fingerprint_and_embed
        fingerprint_and_embed.delay(str(asset_id))
    except Exception:
        pass  # Worker may not be available in test env

    return AssetUploadResponse(asset_id=asset_id, status="uploading", message="Asset upload accepted. Processing started.")


@router.post("/bulk-upload", status_code=202)
async def bulk_upload(
    files: List[UploadFile] = File(...),
    organization_id: str = Form(...),
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(limit=10)),
):
    if len(files) > 50:
        raise HTTPException(status_code=422, detail="Bulk upload limited to 50 files per batch")
    results = []
    for file in files:
        try:
            asset_type, ext = validate_file(file.filename, file.content_type)
            asset_id = uuid.uuid4()
            dest_path = os.path.join(settings.upload_dir, str(asset_id), file.filename)
            file_size = await save_upload(file, dest_path)
            asset = Asset(
                id=asset_id,
                organization_id=uuid.UUID(organization_id),
                title=file.filename,
                asset_type=asset_type,
                file_path=dest_path,
                file_size_bytes=file_size,
                mime_type=file.content_type,
                status="uploading",
                created_by=current_user.id,
            )
            db.add(asset)
            db.commit()
            try:
                from app.worker.tasks import fingerprint_and_embed
                fingerprint_and_embed.delay(str(asset_id))
            except Exception:
                pass
            results.append({"asset_id": str(asset_id), "filename": file.filename, "status": "uploading"})
        except HTTPException as e:
            results.append({"filename": file.filename, "status": "error", "detail": e.detail})
    return {"results": results, "total": len(files), "accepted": sum(1 for r in results if r.get("status") == "uploading")}


@router.get("/", response_model=list[AssetResponse])
def list_assets(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    query = db.query(Asset)
    if current_user.role != "Admin":
        query = query.filter(Asset.organization_id == current_user.organization_id)
    return query.all()


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if current_user.role != "Admin" and asset.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions for this resource")
    return asset


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str,
    current_user: User = Depends(require_role("Admin")),
    db: Session = Depends(get_db),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if os.path.exists(asset.file_path):
        shutil.rmtree(os.path.dirname(asset.file_path), ignore_errors=True)
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted"}
