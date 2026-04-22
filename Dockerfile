FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y \
    libmagic1 libgl1 libglib2.0-0 \
    nodejs npm supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install CPU torch (smaller)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Backend deps
WORKDIR /app/backend
COPY backend/requirements.txt .
COPY backend/requirements.worker.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir open-clip-torch faiss-cpu

# Frontend deps
WORKDIR /app/frontend
COPY frontend/package.json .
RUN npm install

# Copy source
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Supervisor config to run all processes
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /app

EXPOSE 7860

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
