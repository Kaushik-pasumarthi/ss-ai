FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libmagic1 \
    libmagic-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create required directories
RUN mkdir -p /app/uploads/frames /app/uploads/heatmaps /app/uploads/pirated /app/uploads/suspicious /app/faiss_data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
