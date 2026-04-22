from PIL import Image
import imagehash


class FingerprintEngine:
    def compute(self, image: Image.Image) -> str:
        """Compute pHash for a PIL Image. Returns 64-bit hex string."""
        return str(imagehash.phash(image))

    def compute_from_path(self, path: str) -> str:
        img = Image.open(path).convert("RGB")
        return self.compute(img)

    def hamming_distance(self, hash1: str, hash2: str) -> int:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return h1 - h2

    def similarity_score(self, hash1: str, hash2: str) -> float:
        """Returns 0.0–1.0 similarity (1.0 = identical)."""
        dist = self.hamming_distance(hash1, hash2)
        return max(0.0, 1.0 - dist / 64.0)
