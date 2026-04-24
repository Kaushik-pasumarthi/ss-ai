#!/bin/bash
set -e

echo "Starting SportShield AI backend..."

# Start Celery worker in background (ignore errors if it fails)
celery -A app.worker.celery_app worker --loglevel=warning --concurrency=1 &
WORKER_PID=$!
echo "Celery worker started (PID: $WORKER_PID)"

# Start Celery beat in background
celery -A app.worker.celery_app beat --loglevel=warning &
BEAT_PID=$!
echo "Celery beat started (PID: $BEAT_PID)"

# Start FastAPI (foreground — keeps container alive)
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
