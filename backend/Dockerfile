FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libmagic1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch (much smaller)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir open-clip-torch faiss-cpu

COPY . .

RUN mkdir -p /app/uploads/frames /app/uploads/heatmaps /app/uploads/pirated /app/uploads/suspicious /app/faiss_data

RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
