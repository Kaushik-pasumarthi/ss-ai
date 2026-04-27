# SportShield AI

A full-stack anti-piracy and unauthorized sports media tracking platform. SportShield AI authenticates official media assets via perceptual fingerprinting and CNN embeddings, detects unauthorized copies using FAISS-powered similarity search, and surfaces real-time alerts through a futuristic dashboard.

link to actual dashboard- https://sport-shield-ai.onrender.com/ 

**please visit  the following website to actually see whats happening behind the model.**

link to raw engine- https://sportshield-ai-nine.vercel.app/
## Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion, Recharts, Socket.IO client
- **Backend**: FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis
- **AI Worker**: Celery, PyTorch, CLIP (ViT-B/32), FAISS, OpenCV, imagehash
- **Infrastructure**: Docker Compose, Vercel (frontend), Render (backend + worker)

## Quick Start

```bash
cp .env.example .env
docker-compose up --build
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## How Detection Works

1. Upload an official media asset — the system generates a perceptual hash and a CLIP embedding, stores it in FAISS, and issues a blockchain-style certificate.
2. The mock crawler continuously simulates suspicious uploads from YouTube, websites, and social media.
3. Each suspicious upload is embedded and queried against the FAISS index. If the cosine similarity exceeds the configured threshold (default 0.80), an Incident is created.
4. Incidents appear in real time on the Alert Dashboard via Socket.IO. The Forensics Viewer shows a side-by-side comparison with a similarity heatmap and XAI breakdown.

## Environment Variables

See `.env.example` for all required configuration.

## Deployment

- **Frontend** → Vercel (`vercel.json` included)
- **Backend + Worker** → Render or any Docker-compatible host
- **Database** → Render PostgreSQL or Supabase
- **Redis** → Upstash Redis
