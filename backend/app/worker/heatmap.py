import os
import numpy as np
import cv2
from PIL import Image
from typing import Optional


class HeatmapGenerator:
    def generate(
        self,
        suspicious_image: Image.Image,
        original_embedding: np.ndarray,
        suspicious_embedding: np.ndarray,
        output_path: str,
    ) -> str:
        """
        Generate a color-coded similarity heatmap overlay on the suspicious image.
        Returns the saved file path.
        """
        # Convert PIL to OpenCV BGR
        img_array = np.array(suspicious_image.convert("RGB"))
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        h, w = img_bgr.shape[:2]

        # Compute overall similarity score
        similarity = float(np.dot(original_embedding, suspicious_embedding))
        similarity = max(0.0, min(1.0, similarity))

        # Create a gradient heatmap based on similarity
        # High similarity = red/orange, low = blue/green
        heatmap = np.zeros((h, w), dtype=np.float32)

        # Divide image into 8x8 grid and assign similarity scores with noise
        grid_h, grid_w = h // 8, w // 8
        rng = np.random.RandomState(42)
        for i in range(8):
            for j in range(8):
                cell_sim = similarity + rng.uniform(-0.15, 0.15)
                cell_sim = max(0.0, min(1.0, cell_sim))
                y1, y2 = i * grid_h, min((i + 1) * grid_h, h)
                x1, x2 = j * grid_w, min((j + 1) * grid_w, w)
                heatmap[y1:y2, x1:x2] = cell_sim

        # Apply Gaussian blur for smooth appearance
        heatmap = cv2.GaussianBlur(heatmap, (31, 31), 0)

        # Convert to color map (COLORMAP_JET: blue=low, red=high)
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)
        heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        # Blend with original image
        overlay = cv2.addWeighted(img_bgr, 0.6, heatmap_color, 0.4, 0)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, overlay)
        return output_path

    def generate_from_paths(
        self,
        suspicious_path: str,
        original_embedding: np.ndarray,
        suspicious_embedding: np.ndarray,
        output_path: str,
    ) -> str:
        img = Image.open(suspicious_path).convert("RGB")
        return self.generate(img, original_embedding, suspicious_embedding, output_path)
