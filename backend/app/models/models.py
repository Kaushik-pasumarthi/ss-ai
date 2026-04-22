import uuid
from datetime import datetime
from sqlalchemy import (
    String, Boolean, Integer, Float, Text, Index,
    ForeignKey, Enum as SAEnum, JSON, LargeBinary
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship("User", back_populates="organization")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="organization")
    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(
        SAEnum("Admin", "Sports_League_Manager", "Broadcaster_Analyst", "Compliance_Officer", name="user_role"),
        nullable=False,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="creator")
    takedown_actions: Mapped[list["TakedownAction"]] = relationship("TakedownAction", back_populates="requester")


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    asset_type: Mapped[str] = mapped_column(
        SAEnum("video", "image", "logo", "broadcast_clip", name="asset_type"),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum("uploading", "processing", "registered", "failed", name="asset_status"),
        nullable=False,
        default="uploading",
    )
    fingerprint_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    upload_timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="assets")
    creator: Mapped["User"] = relationship("User", back_populates="assets")
    embeddings: Mapped[list["Embedding"]] = relationship("Embedding", back_populates="asset")
    certificate: Mapped["Certificate | None"] = relationship("Certificate", back_populates="asset", uselist=False)
    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="asset")
    webhook_events: Mapped[list["WebhookEvent"]] = relationship("WebhookEvent", back_populates="linked_asset")


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    keyframe_timestamp: Mapped[float | None] = mapped_column(Float, nullable=True)
    vector: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    model_version: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="embeddings")


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), unique=True, nullable=False)
    transaction_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    block_number: Mapped[int] = mapped_column(Integer, nullable=False)
    fingerprint_hash: Mapped[str] = mapped_column(String, nullable=False)
    organization_name: Mapped[str] = mapped_column(String, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="certificate")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type: Mapped[str] = mapped_column(
        SAEnum("youtube", "website", "social_media", name="source_type"),
        nullable=False,
    )
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    suspicious_media_path: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "running", "completed", "failed", "permanently_failed", name="scan_job_status"),
        nullable=False,
        default="pending",
    )
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    dispatched_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="scan_job")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scan_jobs.id"), nullable=False)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[str] = mapped_column(
        SAEnum("youtube", "website", "social_media", name="incident_source_type"),
        nullable=False,
    )
    match_score: Mapped[float] = mapped_column(Float, nullable=False)
    detection_timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)
    heatmap_path: Mapped[str | None] = mapped_column(String, nullable=True)
    geo_country: Mapped[str | None] = mapped_column(String, nullable=True)
    resolution_status: Mapped[str] = mapped_column(
        SAEnum("Open", "Under_Review", "Resolved", "Dismissed", name="resolution_status"),
        nullable=False,
        default="Open",
    )
    resolution_updated_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolution_previous_status: Mapped[str | None] = mapped_column(String, nullable=True)
    perceptual_hash_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    embedding_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    keyframe_match_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tampering_flags: Mapped[dict] = mapped_column(JSON, default=dict)

    scan_job: Mapped["ScanJob"] = relationship("ScanJob", back_populates="incidents")
    asset: Mapped["Asset"] = relationship("Asset", back_populates="incidents")
    organization: Mapped["Organization"] = relationship("Organization", back_populates="incidents")
    takedown_actions: Mapped[list["TakedownAction"]] = relationship("TakedownAction", back_populates="incident")
    webhook_events: Mapped[list["WebhookEvent"]] = relationship("WebhookEvent", back_populates="linked_incident")


class TakedownAction(Base):
    __tablename__ = "takedown_actions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        SAEnum("Draft", "Submitted", "Acknowledged", "Resolved", name="takedown_status"),
        nullable=False,
        default="Draft",
    )
    severity: Mapped[str] = mapped_column(
        SAEnum("Low", "Medium", "High", "Critical", name="takedown_severity"),
        nullable=False,
        default="Low",
    )
    dmca_draft_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    requested_at: Mapped[datetime | None] = mapped_column(nullable=True)
    status_history: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="takedown_actions")
    requester: Mapped["User"] = relationship("User", back_populates="takedown_actions")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_platform: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    received_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    linked_incident_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True)
    linked_asset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)

    linked_incident: Mapped["Incident | None"] = relationship("Incident", back_populates="webhook_events")
    linked_asset: Mapped["Asset | None"] = relationship("Asset", back_populates="webhook_events")
