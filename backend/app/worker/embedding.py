import numpy as np
from PIL import Image

# Module-level singleton — loaded once per worker process
_model = None
_preprocess = None


def _get_model():
    global _model, _preprocess
    if _model is None:
        # Check if we should use mock mode (low memory environments)
        import os
        if os.environ.get("USE_MOCK_EMBEDDINGS", "false").lower() == "true":
            _model = "mock"
            return _model, _preprocess
        try:
            import torch
            import open_clip
            _model, _, _preprocess = open_clip.create_model_and_transforms(
                "ViT-B-32", pretrained="openai"
            )
            _model.eval()
        except Exception:
            _model = "mock"
    return _model, _preprocess


class EmbeddingEngine:
    def encode(self, image: Image.Image) -> np.ndarray:
        """Returns L2-normalized 512-dim float32 embedding."""
        model, preprocess = _get_model()

        if model == "mock":
            import hashlib
            img_bytes = image.tobytes()
            seed = int(hashlib.md5(img_bytes[:1000]).hexdigest(), 16) % (2**32)
            rng = np.random.RandomState(seed)
            vec = rng.randn(512).astype(np.float32)
            return vec / np.linalg.norm(vec)

        import torch
        img_tensor = preprocess(image).unsqueeze(0)
        with torch.no_grad():
            features = model.encode_image(img_tensor)
            features = features / features.norm(dim=-1, keepdim=True)
        return features.squeeze().numpy().astype(np.float32)

    def encode_from_path(self, path: str) -> np.ndarray:
        img = Image.open(path).convert("RGB")
        return self.encode(img)

    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        score = float(np.dot(vec1, vec2))
        return max(0.0, min(1.0, score))


# Singleton instance
embedding_engine = EmbeddingEngine()
