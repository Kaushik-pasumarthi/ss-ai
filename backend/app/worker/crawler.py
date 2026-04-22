import random
import uuid
import os
import numpy as np
from PIL import Image
from typing import Tuple
from app.core.config import settings

YOUTUBE_URLS = [
    "https://www.youtube.com/watch?v=mock_{id}",
    "https://youtu.be/mock_{id}",
]
WEBSITE_URLS = [
    "https://piracy-site-{n}.com/video/{id}",
    "https://streamfree-{n}.net/watch/{id}",
    "https://sports-leak-{n}.org/clip/{id}",
]
SOCIAL_URLS = [
    "https://twitter.com/user_{n}/status/{id}",
    "https://www.instagram.com/p/{id}/",
    "https://t.me/sportsleak_{n}/{id}",
]
GEO_COUNTRIES = [
    "US", "IN", "BR", "RU", "CN", "DE", "FR", "GB", "PK", "NG",
    "ID", "MX", "TR", "SA", "EG", "UA", "PL", "AR", "VN", "TH",
]

SOURCE_TYPES = ["youtube", "website", "social_media"]


class MockCrawler:
    def generate_suspicious_media(self, base_dir: str = None) -> Tuple[str, str, str, str]:
        """
        Returns (source_url, media_path, source_type, geo_country).
        Creates a synthetic image as the suspicious media.
        """
        source_type = random.choice(SOURCE_TYPES)
        uid = str(uuid.uuid4())[:8]
        n = random.randint(1, 99)
        geo_country = random.choice(GEO_COUNTRIES)

        if source_type == "youtube":
            source_url = random.choice(YOUTUBE_URLS).format(id=uid)
        elif source_type == "website":
            source_url = random.choice(WEBSITE_URLS).format(id=uid, n=n)
        else:
            source_url = random.choice(SOCIAL_URLS).format(id=uid, n=n)

        # Generate a synthetic suspicious image (colored noise)
        upload_dir = base_dir or settings.upload_dir
        media_dir = os.path.join(upload_dir, "suspicious", uid)
        os.makedirs(media_dir, exist_ok=True)
        media_path = os.path.join(media_dir, f"suspicious_{uid}.png")

        if not os.path.exists(media_path):
            # Create a 224x224 synthetic image with random colors
            arr = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            img = Image.fromarray(arr)
            img.save(media_path)

        return source_url, media_path, source_type, geo_country
