from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Certificate
from app.schemas.schemas import CertificateResponse

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.get("/{transaction_hash}", response_model=CertificateResponse)
def get_certificate(
    transaction_hash: str,
    db: Session = Depends(get_db),
):
    cert = db.query(Certificate).filter(Certificate.transaction_hash == transaction_hash).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert
