#!/bin/bash
echo "Starting SportShield AI backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
