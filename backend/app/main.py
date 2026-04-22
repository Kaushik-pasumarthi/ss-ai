from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.models.base import Base
from app.core.database import engine
from app.core.sanitize import SanitizeMiddleware
from app.api.v1 import auth, assets, incidents, certificates, takedown, analytics, metrics, scan, webhooks, demo
from app.core.config import settings
import app.models.models
import os

app = FastAPI(title="SportShield AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SanitizeMiddleware)

# REST routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(certificates.router, prefix="/api/v1")
app.include_router(takedown.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(metrics.router, prefix="/api/v1")
app.include_router(scan.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # Ensure upload dirs exist
    for d in ["uploads", "pirated", "heatmaps", "frames"]:
        os.makedirs(os.path.join(settings.upload_dir, d), exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve uploaded files (frames, heatmaps, pirated copies) directly
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")

# Mount Socket.IO ASGI app at /ws
try:
    from app.websocket.server import socket_app
    app.mount("/ws", socket_app)
except Exception:
    pass
