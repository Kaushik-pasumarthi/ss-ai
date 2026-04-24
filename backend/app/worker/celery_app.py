from celery import Celery
from app.core.config import settings

# Upstash Redis requires SSL — add ssl_cert_reqs=none for rediss:// URLs
broker_url = settings.redis_url
backend_url = settings.redis_url

broker_transport_options = {}
redis_backend_use_ssl = {}

if broker_url.startswith("rediss://"):
    broker_transport_options = {"visibility_timeout": 3600}
    redis_backend_use_ssl = {"ssl_cert_reqs": None}

celery_app = Celery(
    "sportshield",
    broker=broker_url,
    backend=backend_url,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    broker_use_ssl={"ssl_cert_reqs": None} if broker_url.startswith("rediss://") else None,
    redis_backend_use_ssl=redis_backend_use_ssl if broker_url.startswith("rediss://") else None,
    broker_transport_options=broker_transport_options,
    beat_schedule={
        "run-scan-every-60s": {
            "task": "app.worker.tasks.run_scan_cycle",
            "schedule": 60.0,
        }
    },
)
