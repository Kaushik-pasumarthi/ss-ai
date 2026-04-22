import os
import pickle
import numpy as np
from typing import Optional, Tuple


class FAISSIndexManager:
    def __init__(self, index_path: str, dim: int = 512):
        self.index_path = index_path
        self.dim = dim
        self.index = None
        self.id_map: list[str] = []  # maps FAISS int index → asset_id string
        self._load_or_create()

    def _load_or_create(self):
        try:
            import faiss
            map_path = self.index_path + ".map"
            if os.path.exists(self.index_path) and os.path.exists(map_path):
                self.index = faiss.read_index(self.index_path)
                with open(map_path, "rb") as f:
                    self.id_map = pickle.load(f)
            else:
                self.index = faiss.IndexFlatIP(self.dim)
                self.id_map = []
        except ImportError:
            self.index = None
            self.id_map = []

    def add(self, asset_id: str, vector: np.ndarray):
        if self.index is None:
            return
        vec = vector.astype(np.float32).reshape(1, -1)
        self.index.add(vec)
        self.id_map.append(asset_id)
        self.persist()

    def search(self, vector: np.ndarray, k: int = 1) -> Optional[Tuple[str, float]]:
        """Returns (asset_id, score) or None if index is empty."""
        if self.index is None or self.index.ntotal == 0:
            return None
        vec = vector.astype(np.float32).reshape(1, -1)
        scores, indices = self.index.search(vec, min(k, self.index.ntotal))
        idx = int(indices[0][0])
        score = float(scores[0][0])
        if idx < 0 or idx >= len(self.id_map):
            return None
        return self.id_map[idx], max(0.0, min(1.0, score))

    def persist(self):
        if self.index is None:
            return
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        import faiss
        faiss.write_index(self.index, self.index_path)
        with open(self.index_path + ".map", "wb") as f:
            pickle.dump(self.id_map, f)

    def total(self) -> int:
        return self.index.ntotal if self.index else 0


# Singleton — loaded once per worker process
_faiss_manager: Optional[FAISSIndexManager] = None


def get_faiss_manager(index_path: str = None) -> FAISSIndexManager:
    global _faiss_manager
    if _faiss_manager is None:
        from app.core.config import settings
        path = index_path or settings.faiss_index_path
        _faiss_manager = FAISSIndexManager(path)
    return _faiss_manager
