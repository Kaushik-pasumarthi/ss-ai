import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# --- Organization ---

class OrganizationCreate(BaseModel):
    name: str


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


# --- User ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str
    organization_id: uuid.UUID


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: str
    organization_id: uuid.UUID
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


# --- Asset ---

class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    title: str
    asset_type: str
    file_path: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    mime_type: str
    status: str
    fingerprint_hash: Optional[str] = None
    upload_timestamp: datetime
    created_by: uuid.UUID


class AssetUploadResponse(BaseModel):
    asset_id: uuid.UUID
    status: str
    message: str


# --- Embedding ---

class EmbeddingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    keyframe_timestamp: Optional[float] = None
    model_version: str
    created_at: datetime


# --- Certificate ---

class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    asset_id: uuid.UUID
    transaction_hash: str
    block_number: int
    fingerprint_hash: str
    organization_name: str
    issued_at: datetime


# --- ScanJob ---

class ScanJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_type: str
    source_url: str
    suspicious_media_path: Optional[str] = None
    status: str
    retry_count: int
    dispatched_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    latency_ms: Optional[int] = None


# --- Incident ---

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scan_job_id: uuid.UUID
    asset_id: uuid.UUID
    organization_id: uuid.UUID
    source_url: str
    source_type: str
    match_score: float
    detection_timestamp: datetime
    heatmap_path: Optional[str] = None
    geo_country: Optional[str] = None
    resolution_status: str
    resolution_updated_at: Optional[datetime] = None
    resolution_previous_status: Optional[str] = None
    perceptual_hash_score: Optional[float] = None
    embedding_score: Optional[float] = None
    keyframe_match_count: Optional[int] = None
    tampering_flags: dict[str, Any] = {}


class IncidentStatusUpdate(BaseModel):
    resolution_status: str


# --- TakedownAction ---

class TakedownActionCreate(BaseModel):
    incident_id: uuid.UUID
    severity: str


class TakedownActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    incident_id: uuid.UUID
    status: str
    severity: str
    dmca_draft_text: Optional[str] = None
    requested_by: uuid.UUID
    requested_at: Optional[datetime] = None
    status_history: list[Any] = []
    created_at: datetime


class TakedownTransition(BaseModel):
    new_status: str


# --- WebhookEvent ---

class WebhookEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_platform: str
    payload: dict[str, Any]
    signature_valid: bool
    received_at: datetime
    processed_at: Optional[datetime] = None
    linked_incident_id: Optional[uuid.UUID] = None
    linked_asset_id: Optional[uuid.UUID] = None


# --- Analytics ---

class AnalyticsSummary(BaseModel):
    total_assets: int
    total_incidents: int
    active_threats: int
    scan_frequency: float


class PerformanceMetrics(BaseModel):
    latency_ms: float
    precision: float
    recall: float
    false_positive_rate: float
    trend: str
    window: str


# --- Auth ---

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# --- Demo ---

class DemoSeedResponse(BaseModel):
    incidents_created: int
    assets_created: int
    message: str
