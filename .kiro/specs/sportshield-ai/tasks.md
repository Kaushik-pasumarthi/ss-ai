# Implementation Plan: SportShield AI

## Overview

Incremental implementation across three independently deployable services — Backend (FastAPI/Python), AI Worker (Celery/PyTorch), and Frontend (Next.js 14) — orchestrated via Docker Compose. Tasks are sequenced so each step builds on the previous: infrastructure and data layer first, then backend modules, then AI worker, then frontend, then integration and property tests.

## Tasks

- [ ] 1. Project scaffolding and Docker Compose setup
  - Create monorepo root with `frontend/`, `backend/`, and `docker-compose.yml`
  - Write `backend/Dockerfile` (Python 3.11 slim, installs requirements)
  - Write `frontend/Dockerfile` (Node 20 alpine, Next.js build)
  - Define all six Compose services: `frontend`, `backend`, `worker`, `beat`, `db` (postgres:15), `redis` (redis:7-alpine)
  - Add named volumes `postgres_data` and `faiss_data`; configure inter-service networking
  - Write `.env.example` documenting every required env var for all services
  - Write `vercel.json` with build config and `/api/*` rewrite to backend URL
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [ ] 2. Database models and Alembic migrations
  - [ ] 2.1 Create SQLAlchemy `Base` and all ORM models: `User`, `Organization`, `Asset`, `Embedding`, `Certificate`, `ScanJob`, `Incident`, `TakedownAction`, `WebhookEvent`
    - Add all indexes specified in the data model (org_id, asset_id, detection_timestamp, transaction_hash)
    - _Requirements: 1.4, 2.5, 6.1, 9.6_
  - [ ] 2.2 Create Pydantic schemas for every model (request + response shapes)
    - _Requirements: 9.3_
  - [ ] 2.3 Initialize Alembic and generate initial migration; apply via `alembic upgrade head` in container entrypoint
    - _Requirements: 16.3_

- [ ] 3. Auth module
  - [ ] 3.1 Implement `core/security.py`: bcrypt password hashing, JWT encode/decode (HS256, 15-min access / 7-day refresh), refresh token hash storage
    - _Requirements: 15.1, 12.3, 12.4_
  - [ ] 3.2 Implement `core/permissions.py`: role enum and permission matrix for all four roles against all resource actions
    - _Requirements: 12.1, 12.2, 12.5_
  - [ ] 3.3 Implement `api/v1/auth.py`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
    - Login verifies bcrypt, issues both tokens; refresh rotates refresh token; logout invalidates stored hash
    - _Requirements: 12.3, 12.4, 15.1_
  - [ ]* 3.4 Write unit tests for JWT encode/decode, token expiry, refresh rotation, and permission matrix checks
    - _Requirements: 12.3, 12.5_

- [ ] 4. Core middleware: rate limiter and input sanitization
  - Implement `core/rate_limit.py`: Redis sliding-window counter keyed on `(user_id, endpoint)`; default 100 req/min, upload endpoints 10 req/min
  - Return HTTP 429 with `Retry-After` header on breach
  - Add input sanitization dependency that strips/escapes user-supplied strings before DB writes
  - _Requirements: 15.5, 15.6, 15.7_
  - [ ]* 4.1 Write property test for rate limit response correctness
    - **Property 20: Rate limit response correctness**
    - **Validates: Requirements 15.5, 15.6**

- [ ] 5. Asset registration module
  - [ ] 5.1 Implement `api/v1/assets.py`: `POST /assets/upload` (multipart, single file), `POST /assets/bulk-upload` (up to 50 files), `GET /assets/`, `GET /assets/{id}`, `DELETE /assets/{id}`
    - Stream upload with running byte counter; reject > 500 MB before writing to disk
    - Validate MIME via `python-magic` against declared extension; reject mismatch
    - Store file outside web root; create `Asset` record with `status=uploading`; dispatch `fingerprint_and_embed` Celery task; return 202 with `asset_id`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.9, 1.10, 9.3, 15.3, 15.4_
  - [ ]* 5.2 Write property test for file type validation
    - **Property 1: File type validation accepts only supported formats**
    - **Validates: Requirements 1.1, 1.10**
  - [ ]* 5.3 Write property test for file size limit enforcement
    - **Property 4: File size limit enforcement**
    - **Validates: Requirements 1.9**
  - [ ]* 5.4 Write property test for bulk upload boundary enforcement
    - **Property 3: Bulk upload boundary enforcement**
    - **Validates: Requirements 1.6**
  - [ ]* 5.5 Write property test for MIME type and magic bytes validation
    - **Property 19: MIME type and magic bytes validation**
    - **Validates: Requirements 15.3**

- [ ] 6. AI Worker — fingerprint engine
  - Implement `worker/fingerprint.py`: `FingerprintEngine` class using `imagehash.phash`; accepts image path or PIL Image; returns 64-bit hash string
  - _Requirements: 1.2, 2.2, 2.4_
  - [ ]* 6.1 Write unit tests for pHash generation on known image pairs (identical, cropped, color-shifted)
    - _Requirements: 2.2, 2.4_

- [ ] 7. AI Worker — keyframe extractor
  - Implement `worker/keyframe.py`: `KeyframeExtractor` using OpenCV `VideoCapture`; configurable interval (default 5 s); yields `(timestamp_sec, PIL.Image)` tuples
  - _Requirements: 2.1_
  - [ ]* 7.1 Write property test for keyframe count invariant
    - **Property 6: Keyframe count invariant**
    - **Validates: Requirements 2.1**

- [ ] 8. AI Worker — embedding engine
  - Implement `worker/embedding.py`: `EmbeddingEngine` using `torch` + `open_clip` (CLIP ViT-B/32); load model once at worker startup; `encode(image) → np.ndarray (512,) float32`; L2-normalize output before returning
  - _Requirements: 1.3, 2.2, 2.3_
  - [ ]* 8.1 Write property test for match score range invariant
    - **Property 7: Match score range invariant**
    - **Validates: Requirements 2.3**
  - [ ]* 8.2 Write property test for self-similarity invariant
    - **Property 8: Self-similarity invariant**
    - **Validates: Requirements 2.8**

- [ ] 9. AI Worker — FAISS index manager
  - Implement `worker/faiss_index.py`: `FAISSIndexManager` wrapping `faiss.IndexFlatIP`; methods: `add(asset_id, vector)`, `search(vector, k=1) → (asset_id, score)`, `persist(path)`, `load(path)`; load index from disk on worker startup
  - _Requirements: 2.3, 9.2, 9.5_

- [ ] 10. AI Worker — Celery task: fingerprint_and_embed
  - Implement `worker/tasks.py`: `fingerprint_and_embed(asset_id)` task
    - Load file from filesystem
    - Run `FingerprintEngine` → store `Asset.fingerprint_hash`
    - If video: run `KeyframeExtractor` → for each frame run `EmbeddingEngine` → store `Embedding` rows
    - If image: run `EmbeddingEngine` → store single `Embedding` row
    - Add all embeddings to FAISS index; persist index
    - Generate `Certificate` (SHA-256 of fingerprint_hash + org_id + upload_timestamp)
    - Update `Asset.status = registered`; emit `asset.registered` WebSocket event
    - Configure `autoretry_for=(Exception,)`, `max_retries=3`, `retry_backoff=True`
    - _Requirements: 1.2, 1.3, 1.11, 2.1, 2.2, 6.1, 3.8_
  - [ ]* 10.1 Write property test for certificate generation completeness
    - **Property 5: Certificate generation completeness**
    - **Validates: Requirements 1.11**
  - [ ]* 10.2 Write property test for certificate hash determinism
    - **Property 13: Certificate hash determinism**
    - **Validates: Requirements 6.4**
  - [ ]* 10.3 Write property test for asset metadata round-trip preservation
    - **Property 2: Asset metadata round-trip preservation**
    - **Validates: Requirements 1.4**

- [ ] 11. AI Worker — heatmap generator
  - Implement `worker/heatmap.py`: `HeatmapGenerator`; accepts original asset embedding regions and suspicious upload image; computes per-region cosine similarity; generates color-coded OpenCV overlay; saves PNG to filesystem; returns file path
  - _Requirements: 2.7, 5.3, 17.3_

- [ ] 12. AI Worker — mock crawler
  - Implement `worker/crawler.py`: `MockCrawler` that generates synthetic suspicious media records for three source types: `youtube`, `website`, `social_media`; returns `(source_url, media_path, source_type, geo_country)`
  - _Requirements: 3.1_

- [ ] 13. Scan job pipeline
  - [ ] 13.1 Implement `worker/tasks.py`: `run_scan_job(job_id)` task
    - Load `ScanJob`; invoke `MockCrawler` to get suspicious media
    - Run `FingerprintEngine` + `EmbeddingEngine` on suspicious media
    - Call `FAISSIndexManager.search` → `(asset_id, match_score)`
    - If `match_score >= threshold`: create `Incident`, dispatch `generate_heatmap` task, emit `incident.created` WebSocket event
    - Update `ScanJob.status`, `latency_ms`, `completed_at`
    - `autoretry_for=(Exception,)`, `max_retries=3`, `retry_backoff=True`; on exhaustion set `permanently_failed`
    - _Requirements: 2.3, 2.5, 2.6, 3.3, 3.5, 3.8_
  - [ ] 13.2 Implement Celery beat schedule: dispatch `run_scan_job` every 60 seconds
    - _Requirements: 3.2_
  - [ ]* 13.3 Write property test for threshold-based incident creation
    - **Property 9: Threshold-based incident creation**
    - **Validates: Requirements 2.5**
  - [ ]* 13.4 Write property test for configurable threshold range enforcement
    - **Property 10: Configurable threshold range enforcement**
    - **Validates: Requirements 2.6**
  - [ ]* 13.5 Write property test for scan job retry count invariant
    - **Property 11: Scan job retry count invariant**
    - **Validates: Requirements 3.8**

- [ ] 14. Checkpoint — backend core complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Incident module
  - Implement `api/v1/incidents.py`: `GET /incidents/` (paginated, org-scoped), `GET /incidents/{id}` (detail + XAI data), `PATCH /incidents/{id}/status`
  - Status update records `resolution_previous_status` and `resolution_updated_at`
  - _Requirements: 2.5, 5.1, 5.4, 7.7, 7.8, 17.1, 17.2_
  - [ ]* 15.1 Write property test for resolution status transition audit
    - **Property 17: Resolution status transition audit**
    - **Validates: Requirements 7.8**

- [ ] 16. Certificate module
  - Implement `api/v1/certificates.py`: `GET /certificates/{hash}` — public, no auth; looks up `Certificate` by `transaction_hash`; returns full certificate fields
  - _Requirements: 6.2, 6.3, 6.5_

- [ ] 17. Takedown and enforcement module
  - Implement `api/v1/takedown.py`: `POST /takedown/`, `GET /takedown/{id}`, `POST /takedown/{id}/transition`, `PATCH /takedown/{id}/severity`
  - Enforce state machine: `Draft → Submitted → Acknowledged → Resolved`; reject out-of-order or backward transitions with HTTP 422 and descriptive message
  - Record `status_history` JSON on every transition (status, timestamp, user_id)
  - Pre-populate `dmca_draft_text` with Incident ID, asset title, org name, source URL, timestamp, match score
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  - [ ]* 17.1 Write property test for takedown workflow order enforcement
    - **Property 18: Takedown workflow order enforcement**
    - **Validates: Requirements 13.7**

- [ ] 18. Analytics module
  - Implement `api/v1/analytics.py`: `GET /analytics/incidents` (filter by date range, source type, match score range, asset name, resolution status; sort by any column; paginate 25/page), `GET /analytics/summary`, `GET /analytics/export/csv`, `GET /analytics/export/pdf`
  - CSV export: stream all filtered rows with all displayed columns
  - PDF export: summary header, active filter params, incidents table (use `reportlab` or `weasyprint`)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [ ]* 18.1 Write property test for incident filter correctness
    - **Property 14: Incident filter correctness**
    - **Validates: Requirements 7.2**
  - [ ]* 18.2 Write property test for incident sort ordering invariant
    - **Property 15: Incident sort ordering invariant**
    - **Validates: Requirements 7.3**
  - [ ]* 18.3 Write property test for CSV export round-trip completeness
    - **Property 16: CSV export round-trip completeness**
    - **Validates: Requirements 7.5**

- [ ] 19. Metrics module
  - Implement `api/v1/metrics.py`: `GET /metrics/performance`
  - Compute detection latency (dispatch → incident creation), precision, recall, false positive rate from `ScanJob` and `Incident` tables for time windows: last hour, last 24 h, last 7 days
  - Return trend indicator (up/down/stable) vs. previous equivalent window
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [ ] 20. Scan trigger and job list endpoints
  - Implement `api/v1/scan.py`: `POST /scan/trigger` (Admin only), `GET /scan/jobs`, `GET /scan/jobs/{id}`
  - _Requirements: 3.3, 9.3_

- [ ] 21. WebSocket server
  - Implement `websocket/server.py`: mount `python-socketio` AsyncServer on FastAPI at `/ws`
  - On connect: validate JWT from query param `?token=`; join rooms `org:{org_id}`, `user:{user_id}`; start 30 s heartbeat; reject invalid/expired tokens before any event delivery
  - On disconnect: leave rooms, cancel heartbeat
  - Configure `AsyncRedisManager` for multi-worker pub/sub broadcasting
  - Define event emitters in `websocket/events.py` for all seven event types
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_
  - [ ]* 21.1 Write property test for WebSocket authentication enforcement
    - **Property 21: WebSocket authentication enforcement**
    - **Validates: Requirements 21.4**

- [ ] 22. Webhook ingestion endpoint
  - Implement `api/v1/webhooks.py`: `POST /webhooks/ingest`
  - Validate HMAC-SHA256 signature from `X-Hub-Signature-256` header against shared secret; reject with 401 and log on failure
  - Parse payload; link to `Incident` or `Asset` if IDs present; store `WebhookEvent` record; process within 10 s
  - _Requirements: 14.2, 14.3, 14.4_

- [ ] 23. Demo seed and trigger endpoints
  - Implement `api/v1/demo.py`: `POST /demo/seed` (Admin only) — generate 50+ `Incident` records with varied match scores, source types, timestamps spanning past 30 days, geo_country values; complete within 10 s
  - `POST /demo/trigger` — emit `demo.step` WebSocket events for the 5-step guided demo scenario
  - _Requirements: 3.6, 3.7, 11.1, 11.2, 11.3_
  - [ ]* 23.1 Write property test for demo data completeness
    - **Property 12: Demo data completeness**
    - **Validates: Requirements 3.6_

- [ ] 24. Checkpoint — full backend and AI worker complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Frontend — project setup
  - Scaffold Next.js 14 App Router project inside `frontend/`
  - Install and configure: Tailwind CSS (dark theme, neon cyan/blue accent tokens), Framer Motion, Recharts, `socket.io-client`, `axios`
  - Set up global CSS with glassmorphism utility classes (backdrop-blur, semi-transparent bg)
  - Configure `next.config.js` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` env vars
  - _Requirements: 10.1, 10.2, 10.3, 16.4_

- [x] 26. Frontend — shared components
  - [x] 26.1 Implement `GlassCard` — glassmorphism panel wrapper with Framer Motion fade-in
    - _Requirements: 10.2, 10.3_
  - [x] 26.2 Implement `ToastProvider` — global toast system for success/error/info notifications
    - _Requirements: 10.7_
  - [x] 26.3 Implement `SkeletonLoader` — animated placeholder for data-fetching components
    - _Requirements: 10.6_
  - [x] 26.4 Implement `RoleGuard` — wraps routes/components; reads JWT role claim; redirects or hides based on permission matrix
    - _Requirements: 12.2, 12.6_
  - [x] 26.5 Implement `NavBar` — responsive top nav with role-aware links, demo mode button, presentation mode button
    - _Requirements: 10.5, 11.1, 20.1_

- [ ] 27. Frontend — Landing Page (`/`)
  - Implement `LandingPage`: hero section, problem/solution copy, key innovations, impact metrics, CTA buttons linking to `/dashboard` and `/demo`
  - Embed `ArchitectureDiagram` component (see task 35)
  - Apply Framer Motion entrance animations
  - _Requirements: 8.1, 8.2, 10.1, 10.3_

- [ ] 28. Frontend — Alert Dashboard (`/dashboard`)
  - [ ] 28.1 Implement summary panels: total assets protected, total incidents, active threats, scan frequency — fetch from `GET /analytics/summary`
    - _Requirements: 4.1, 4.6_
  - [ ] 28.2 Implement `LiveIncidentFeed` — Socket.IO-connected list; updates on `incident.created` event without page reload; shows source URL, asset name, match score %, timestamp, source type icon
    - _Requirements: 4.2, 4.7, 4.8, 21.2, 21.3_
  - [ ] 28.3 Implement Recharts time-series chart: incidents per day over past 30 days
    - _Requirements: 4.3_
  - [ ] 28.4 Implement geographic heatmap panel: simulated country origin of incidents
    - _Requirements: 4.4_
  - [ ] 28.5 Implement category breakdown chart: incident counts by source type (Recharts pie/bar)
    - _Requirements: 4.5_

- [ ] 29. Frontend — Asset Registration UI (`/assets`)
  - Implement drag-and-drop single file upload zone with MIME validation feedback
  - Implement bulk upload (up to 50 files) with per-file progress bars and status indicators
  - Display thumbnail preview (image) or keyframe preview (video) after upload completes
  - Show toast on successful registration; show `SkeletonLoader` while processing
  - _Requirements: 1.5, 1.6, 1.7, 1.8, 10.6, 10.7_

- [ ] 30. Frontend — Asset Detail page (`/assets/[id]`)
  - Fetch `GET /assets/{id}`; display metadata (title, type, size, duration, upload timestamp)
  - Display `Certificate` card with transaction hash, block number, org name, fingerprint hash, and "Verified on Chain" badge
  - Display embedding status and fingerprint hash
  - _Requirements: 1.11, 1.12, 6.2, 6.3_

- [ ] 31. Frontend — Forensics Viewer (`/incidents/[id]`)
  - [ ] 31.1 Implement `SimilaritySlider` — interactive before/after image comparison slider (original vs. suspicious upload)
    - _Requirements: 5.1, 5.2_
  - [ ] 31.2 Implement `HeatmapOverlay` — canvas-based renderer for heatmap PNG over suspicious upload
    - _Requirements: 5.3_
  - [ ] 31.3 Implement XAI panel: confidence score breakdown (pHash score, embedding score, keyframe match count), tampering flags, plain-language summary sentence, matched keyframe timestamps for video
    - _Requirements: 5.4, 5.5, 17.1, 17.2, 17.3, 17.4, 17.5_
  - [ ] 31.4 Implement takedown action panel: DMCA draft text (editable), severity selector, workflow state machine controls, status history timeline
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.8_
  - [ ] 31.5 Handle unavailable media: show placeholder thumbnail + "Media Unavailable" label
    - _Requirements: 5.7_

- [ ] 32. Frontend — Analytics Panel (`/analytics`)
  - Implement filterable/sortable paginated table (25 rows/page) fetching `GET /analytics/incidents`
  - Filter controls: date range picker, source type multi-select, match score range slider, asset name search, resolution status select
  - Sort by any column (asc/desc); table updates within 1 s of filter change
  - CSV export button → `GET /analytics/export/csv`; PDF export button → `GET /analytics/export/pdf`; show toast on completion
  - Inline resolution status dropdown per row → `PATCH /incidents/{id}/status`
  - Demo seed button (Admin only) → `POST /demo/seed`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.4_

- [ ] 33. Frontend — Metrics Dashboard (`/metrics`)
  - Fetch `GET /metrics/performance`; display latency (ms), precision, recall, FPR as numeric values + trend indicators
  - Time window selector: last hour / last 24 h / last 7 days
  - Recharts line/area charts for each metric over time
  - Update on `metrics.updated` WebSocket event without page reload
  - Show "No data for this period" when no scan jobs in window
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [ ] 34. Frontend — Guided Demo Mode (`/demo`)
  - Implement 5-step walkthrough: (1) official clip upload, (2) pirate upload detected, (3) AI flagging incident, (4) dashboard alert, (5) forensics viewer with tampering proof
  - Each step shows contextual explanation panel; step 4 alert appears within 2 s via WebSocket
  - Auto-advance timer (default 5 s/step) with manual override; progress indicator
  - Summary screen after step 5 showing full scenario timeline
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 35. Frontend — SVG Architecture Diagram component
  - Implement `ArchitectureDiagram`: SVG pipeline with labeled nodes: Upload → Fingerprint Engine → AI Matcher → Scan Engine → Alert Dashboard → Enforcement Module
  - Directional arrows between nodes; responsive (scales to viewport 375 px–1920 px)
  - Hover/focus tooltip per node describing role and technology
  - _Requirements: 8.2, 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 36. Frontend — Presentation Mode (`/presentation`)
  - Implement full-screen slideshow: 5 slides in order — Problem, Solution, Innovation, Demo Impact, Metrics
  - Hide application chrome in full-screen mode
  - Keyboard arrow-key navigation + on-screen prev/next controls
  - Metrics slide fetches live data from `GET /metrics/performance`
  - Exit returns user to launch page
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

- [ ] 37. Frontend — Certificate Verification page (`/verify/[hash]`)
  - Public page (no auth); input field for transaction hash; fetches `GET /certificates/{hash}`; displays full certificate fields and "Verified on Chain" badge
  - _Requirements: 6.5_

- [ ] 38. Checkpoint — full frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 39. Integration tests
  - [ ]* 39.1 Write integration test: asset upload → fingerprint_and_embed task → FAISS index contains embedding → certificate created
    - _Requirements: 1.2, 1.3, 1.11, 2.2_
  - [ ]* 39.2 Write integration test: scan job dispatch → incident creation → WebSocket `incident.created` event delivered to subscribed client
    - _Requirements: 2.5, 3.5, 21.2_
  - [ ]* 39.3 Write integration test: JWT auth flow — login → access protected route → refresh token → logout → verify refresh invalidated
    - _Requirements: 12.3, 12.4, 15.1_
  - [ ]* 39.4 Write integration test: webhook ingestion — valid HMAC → incident updated; invalid HMAC → 401 returned
    - _Requirements: 14.3, 14.4_
  - [ ]* 39.5 Write integration test: rate limiter — exceed upload limit → 429 with Retry-After header
    - _Requirements: 15.5, 15.6_

- [ ] 40. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use Hypothesis `@given` with `@settings(max_examples=100)` and are tagged `# Feature: sportshield-ai, Property N: <text>`
- The design document's Correctness Properties section defines all 21 properties; each property sub-task references its property number
- FAISS index is persisted to the `faiss_data` Docker volume and reloaded on worker startup
- All Celery tasks use `autoretry_for=(Exception,)`, `max_retries=3`, `retry_backoff=True`
