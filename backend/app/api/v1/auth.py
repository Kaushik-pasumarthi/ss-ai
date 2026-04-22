from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, hash_refresh_token,
)
from app.models.refresh_token import store_refresh_token, get_refresh_token_hash, revoke_refresh_token
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(token: str, db: Session) -> User:
    """Decode JWT and return User. Raises 401 if invalid."""
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user.last_login = datetime.utcnow()
    db.commit()
    token_data = {"sub": str(user.id), "role": user.role, "org_id": str(user.organization_id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    store_refresh_token(str(user.id), hash_refresh_token(refresh_token))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        stored_hash = get_refresh_token_hash(user_id)
        if stored_hash != hash_refresh_token(refresh_token):
            raise HTTPException(status_code=401, detail="Refresh token revoked or invalid")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        token_data = {"sub": str(user.id), "role": user.role, "org_id": str(user.organization_id)}
        new_access = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)
        store_refresh_token(user_id, hash_refresh_token(new_refresh))
        return TokenResponse(access_token=new_access, refresh_token=new_refresh)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@router.post("/logout")
def logout(refresh_token: str):
    try:
        payload = decode_token(refresh_token)
        user_id = payload.get("sub")
        revoke_refresh_token(user_id)
    except Exception:
        pass
    return {"message": "Logged out successfully"}
