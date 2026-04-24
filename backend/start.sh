#!/bin/bash
# Start Celery worker in background
celery -A app.worker.celery_app worker --loglevel=info --concurrency=1 &
celery -A app.worker.celery_app beat --loglevel=info &

# Start FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8000
