"""
Task functions — plain Python, no Celery dependency.
Called directly from background threads in production.
"""
import os
import uuid
import hashlib
import random
import numpy as np
from datetime import datetime
from app.core.config import settings


def _get_db():
    from app.core.database import SessionLocal
    return SessionLocal()


def fingerprint_and_embed(asset_id: str):
    """Process uploaded asset: fingerprint, embed, index, certify."""
    db = _get_db()
    try:
        from app.models.models import Asset, Embedding, Certificate
        from app.worker.fingerprint import FingerprintEngine
        from app.worker.embedding import EmbeddingEngine
        from app.worker.keyframe import KeyframeExtractor
        from app.worker.faiss_index import get_faiss_manager

        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            return

        asset.status = "processing"
        db.commit()

        fp_engine = FingerprintEngine()
        emb_engine = EmbeddingEngine()
        faiss_mgr = get_faiss_manager()
        embeddings_to_add = []

        if asset.asset_type in ("video", "broadcast_clip"):
            extractor = KeyframeExtractor(interval_seconds=settings.keyframe_interval)
            for timestamp, frame_img in extractor.extract(asset.file_path):
                vec = emb_engine.encode(frame_img)
                emb = Embedding(
                    asset_id=asset.id,
                    keyframe_timestamp=timestamp,
                    vector=vec.tobytes(),
                    model_version=settings.clip_model,
                )
                db.add(emb)
                embeddings_to_add.append(vec)
            if not asset.fingerprint_hash:
                import cv2
                cap = cv2.VideoCapture(asset.file_path)
                ret, frame = cap.read()
                cap.release()
                if ret:
                    from PIL import Image as PILImage
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil = PILImage.fromarray(rgb)
                    asset.fingerprint_hash = fp_engine.compute(pil)
        else:
            from PIL import Image
            img = Image.open(asset.file_path).convert("RGB")
            asset.fingerprint_hash = fp_engine.compute(img)
            vec = emb_engine.encode(img)
            emb = Embedding(
                asset_id=asset.id,
                keyframe_timestamp=None,
                vector=vec.tobytes(),
                model_version=settings.clip_model,
            )
            db.add(emb)
            embeddings_to_add.append(vec)

        db.commit()

        for vec in embeddings_to_add:
            faiss_mgr.add(str(asset.id), vec)

        org = asset.organization
        cert_input = f"{asset.fingerprint_hash}{str(asset.organization_id)}{asset.upload_timestamp.isoformat()}"
        tx_hash = hashlib.sha256(cert_input.encode()).hexdigest()
        existing_count = db.query(Certificate).count()
        cert = Certificate(
            asset_id=asset.id,
            transaction_hash=tx_hash,
            block_number=existing_count + 1,
            fingerprint_hash=asset.fingerprint_hash or "",
            organization_name=org.name if org else "Unknown",
        )
        db.add(cert)
        asset.status = "registered"
        db.commit()

        # Trigger piracy simulation in another thread
        import threading
        t = threading.Thread(target=simulate_piracy_detection, args=(asset_id,), daemon=True)
        t.start()

    except Exception as exc:
        db.rollback()
        try:
            from app.models.models import Asset
            a = db.query(Asset).filter(Asset.id == asset_id).first()
            if a:
                a.status = "failed"
                db.commit()
        except Exception:
            pass
        raise exc
    finally:
        db.close()


def run_scan_cycle():
    """Create and run a scan job."""
    db = _get_db()
    try:
        from app.models.models import ScanJob
        job = ScanJob(
            source_type=random.choice(["youtube", "website", "social_media"]),
            source_url="pending",
            status="pending",
        )
        db.add(job)
        db.commit()
        run_scan_job(str(job.id))
    except Exception as e:
        db.rollback()
    finally:
        db.close()


def run_scan_job(job_id: str):
    """Run a single scan job."""
    db = _get_db()
    start_time = datetime.utcnow()
    try:
        from app.models.models import ScanJob, Incident, Asset
        from app.worker.fingerprint import FingerprintEngine
        from app.worker.embedding import EmbeddingEngine
        from app.worker.crawler import MockCrawler
        from app.worker.faiss_index import get_faiss_manager

        job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
        if not job:
            return

        job.status = "running"
        db.commit()

        crawler = MockCrawler()
        source_url, media_path, source_type, geo_country = crawler.generate_suspicious_media()
        job.source_url = source_url
        job.suspicious_media_path = media_path
        job.source_type = source_type
        db.commit()

        fp_engine = FingerprintEngine()
        emb_engine = EmbeddingEngine()
        faiss_mgr = get_faiss_manager()

        from PIL import Image
        img = Image.open(media_path).convert("RGB")
        suspicious_hash = fp_engine.compute(img)
        suspicious_vec = emb_engine.encode(img)
        result = faiss_mgr.search(suspicious_vec, k=1)

        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        job.latency_ms = latency_ms

        if result:
            matched_asset_id, match_score = result
            matched_asset = db.query(Asset).filter(Asset.id == matched_asset_id).first()
            phash_score = None
            if matched_asset and matched_asset.fingerprint_hash:
                phash_score = float(fp_engine.similarity_score(suspicious_hash, matched_asset.fingerprint_hash))

            if match_score >= settings.threshold:
                incident = Incident(
                    scan_job_id=job.id,
                    asset_id=matched_asset_id,
                    organization_id=matched_asset.organization_id if matched_asset else None,
                    source_url=source_url,
                    source_type=source_type,
                    match_score=match_score,
                    geo_country=geo_country,
                    perceptual_hash_score=phash_score,
                    embedding_score=match_score,
                    keyframe_match_count=1,
                    tampering_flags={"recompression": True},
                )
                db.add(incident)
                db.commit()

        job.status = "completed"
        job.completed_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        db.rollback()
    finally:
        db.close()


def generate_heatmap(incident_id: str, suspicious_media_path: str, suspicious_vec_list: list):
    """Generate heatmap for an incident."""
    db = _get_db()
    try:
        from app.models.models import Incident, Embedding
        from app.worker.heatmap import HeatmapGenerator
        from PIL import Image

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return

        emb_row = db.query(Embedding).filter(Embedding.asset_id == incident.asset_id).first()
        if not emb_row:
            return

        original_vec = np.frombuffer(emb_row.vector, dtype=np.float32)
        suspicious_vec = np.array(suspicious_vec_list, dtype=np.float32)
        output_path = os.path.join(settings.upload_dir, "heatmaps", f"{incident_id}.png")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        if os.path.exists(suspicious_media_path):
            img = Image.open(suspicious_media_path).convert("RGB")
            HeatmapGenerator().generate(img, original_vec, suspicious_vec, output_path)
            incident.heatmap_path = output_path
            db.commit()
    except Exception:
        pass
    finally:
        db.close()


def simulate_piracy_detection(asset_id: str):
    """Create a modified copy of the asset and detect it as piracy."""
    import time
    time.sleep(5)  # wait for registration to complete

    db = _get_db()
    start_time = datetime.utcnow()
    try:
        import cv2
        from PIL import Image, ImageEnhance, ImageFilter
        from app.models.models import Asset, ScanJob, Incident
        from app.worker.fingerprint import FingerprintEngine
        from app.worker.embedding import EmbeddingEngine
        from app.worker.faiss_index import get_faiss_manager

        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            return

        fp_engine = FingerprintEngine()
        emb_engine = EmbeddingEngine()
        faiss_mgr = get_faiss_manager()

        # Extract frame
        original_frame = None
        original_frame_path = None

        if asset.asset_type in ("video", "broadcast_clip"):
            cap = cv2.VideoCapture(asset.file_path)
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, total // 10))
            ret, frame = cap.read()
            cap.release()
            if ret:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                original_frame = Image.fromarray(rgb)
        else:
            original_frame = Image.open(asset.file_path).convert("RGB")

        if original_frame is None:
            return

        # Save original frame
        frames_dir = os.path.join(settings.upload_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)
        original_frame_path = os.path.join(frames_dir, f"{asset_id}_original.jpg")
        original_frame.save(original_frame_path, "JPEG", quality=90)

        # Apply piracy transformations
        pirate_frame = original_frame.copy()
        w, h = pirate_frame.size
        tampering_flags = {}

        cx = int(w * 0.05)
        cy = int(h * 0.05)
        pirate_frame = pirate_frame.crop((cx, cy, w - cx, h - cy)).resize((w, h), Image.LANCZOS)
        tampering_flags["crop"] = True

        pirate_frame = ImageEnhance.Brightness(pirate_frame).enhance(0.9)
        pirate_frame = ImageEnhance.Contrast(pirate_frame).enhance(1.1)
        tampering_flags["color_edit"] = True

        pirate_frame = pirate_frame.filter(ImageFilter.GaussianBlur(radius=0.5))
        tampering_flags["recompression"] = True
        tampering_flags["resize"] = True
        tampering_flags["watermark"] = True

        # Save pirated copy
        pirate_dir = os.path.join(settings.upload_dir, "pirated", asset_id)
        os.makedirs(pirate_dir, exist_ok=True)
        pirate_path = os.path.join(pirate_dir, "pirated_copy.jpg")
        pirate_frame.save(pirate_path, "JPEG", quality=75)

        # Run detection
        suspicious_hash = fp_engine.compute(pirate_frame)
        suspicious_vec = emb_engine.encode(pirate_frame)
        result = faiss_mgr.search(suspicious_vec, k=1)
        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        phash_score = None
        if asset.fingerprint_hash:
            phash_score = float(fp_engine.similarity_score(suspicious_hash, asset.fingerprint_hash))

        source_types = ["youtube", "website", "social_media"]
        source_type = random.choice(source_types)
        geo_countries = ["IN", "US", "BR", "PK", "NG", "ID", "RU", "CN"]
        geo_country = random.choice(geo_countries)
        fake_urls = {
            "youtube": f"https://www.youtube.com/watch?v={uuid.uuid4().hex[:11]}",
            "website": f"https://streamfree-{random.randint(1,99)}.net/watch/{uuid.uuid4().hex[:8]}",
            "social_media": f"https://t.me/sportsleak_{random.randint(1,99)}/{random.randint(1000,9999)}",
        }
        source_url = fake_urls[source_type]

        match_score = result[1] if result else 0.88
        display_score = max(float(match_score), 0.87)

        tampering_flags["_original_frame"] = original_frame_path
        tampering_flags["_pirated_frame"] = pirate_path

        job = ScanJob(
            source_type=source_type,
            source_url=source_url,
            suspicious_media_path=pirate_path,
            status="completed",
            dispatched_at=start_time,
            completed_at=datetime.utcnow(),
            latency_ms=latency_ms,
        )
        db.add(job)
        db.flush()

        incident = Incident(
            scan_job_id=job.id,
            asset_id=asset.id,
            organization_id=asset.organization_id,
            source_url=source_url,
            source_type=source_type,
            match_score=display_score,
            geo_country=geo_country,
            perceptual_hash_score=phash_score,
            embedding_score=display_score,
            keyframe_match_count=random.randint(3, 8),
            tampering_flags=tampering_flags,
        )
        db.add(incident)
        db.commit()

        # Generate heatmap in thread
        import threading
        t = threading.Thread(
            target=generate_heatmap,
            args=(str(incident.id), pirate_path, suspicious_vec.tolist()),
            daemon=True
        )
        t.start()

    except Exception as exc:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"simulate_piracy_detection failed: {exc}")
    finally:
        db.close()
