import math
from typing import Generator, Tuple
import cv2
from PIL import Image
import numpy as np


class KeyframeExtractor:
    def __init__(self, interval_seconds: int = 5):
        self.interval_seconds = interval_seconds

    def extract(self, video_path: str) -> Generator[Tuple[float, Image.Image], None, None]:
        """Yield (timestamp_sec, PIL.Image) for each keyframe."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = int(fps * self.interval_seconds)

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % frame_interval == 0:
                timestamp = frame_idx / fps
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb)
                yield timestamp, pil_img
            frame_idx += 1

        cap.release()

    def count_keyframes(self, video_path: str) -> int:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        duration = total_frames / fps
        return math.ceil(duration / self.interval_seconds)
