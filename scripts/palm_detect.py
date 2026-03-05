#!/usr/bin/env python3
"""Palm line detection using MediaPipe hand landmarks.

Input (stdin JSON):
  {
    "image": "data:image/jpeg;base64,...",
    "side": "left" | "right" (optional)
  }

Output (stdout JSON):
  {
    "hasPalm": true,
    "lines": {
      "heart": [[x,y],[x,y],[x,y]],
      "head": [[x,y],[x,y],[x,y]],
      "life": [[x,y],[x,y],[x,y]],
      "fate": [[x,y],[x,y],[x,y]]
    },
    "confidence": {
      "heart": 0.0-1.0,
      "head": 0.0-1.0,
      "life": 0.0-1.0,
      "fate": 0.0-1.0
    }
  }
"""

from __future__ import annotations

import base64
import json
import math
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
except Exception:  # pragma: no cover
    mp = None
    mp_python = None
    mp_vision = None


WRIST = 0
THUMB_CMC = 1
THUMB_MCP = 2
INDEX_MCP = 5
MIDDLE_MCP = 9
RING_MCP = 13
PINKY_MCP = 17


def _emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _no_palm(reason: str) -> dict[str, Any]:
    return {"hasPalm": False, "reason": reason}


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, float(v)))


def _pt(p: tuple[float, float]) -> list[float]:
    return [round(_clamp01(p[0]), 4), round(_clamp01(p[1]), 4)]


def _decode_image(data_url: str) -> np.ndarray:
    if not isinstance(data_url, str) or "," not in data_url:
        raise ValueError("invalid_data_url")
    b64 = data_url.split(",", 1)[1]
    raw = base64.b64decode(b64, validate=False)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("decode_failed")
    return img


def _dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _blend(a: tuple[float, float], b: tuple[float, float], t: float) -> tuple[float, float]:
    return (a[0] * (1.0 - t) + b[0] * t, a[1] * (1.0 - t) + b[1] * t)


def _offset(p: tuple[float, float], dx: float, dy: float) -> tuple[float, float]:
    return (p[0] + dx, p[1] + dy)


def _hand_area(points: list[tuple[float, float]]) -> float:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return max(0.0, (max(xs) - min(xs)) * (max(ys) - min(ys)))


def _resolve_model_path() -> Path | None:
    root = Path(__file__).resolve().parent.parent
    candidates = [
        root / "public" / "mediapipe-wasm" / "hand_landmarker.task",
        root / "public" / "models" / "hand_landmarker.task",
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def _create_landmarker():
    if mp is None or mp_python is None or mp_vision is None:
        return None

    model_path = _resolve_model_path()
    if model_path is None:
        return None

    options = mp_vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.3,
        min_hand_presence_confidence=0.3,
        min_tracking_confidence=0.3,
    )
    return mp_vision.HandLandmarker.create_from_options(options)


def _select_hand(result: Any, side_hint: str) -> dict[str, Any] | None:
    hand_landmarks = list(getattr(result, "hand_landmarks", []) or [])
    hand_labels = list(getattr(result, "handedness", []) or [])
    if not hand_landmarks:
        return None

    candidates: list[dict[str, Any]] = []
    for i, landmarks in enumerate(hand_landmarks):
        points = [(float(lm.x), float(lm.y)) for lm in landmarks]

        label = "unknown"
        score = 0.5
        if i < len(hand_labels) and hand_labels[i]:
            classification = hand_labels[i][0]
            label = str(getattr(classification, "category_name", "unknown")).lower()
            score = float(getattr(classification, "score", 0.5))

        candidates.append(
            {
                "points": points,
                "label": label,
                "score": score,
                "area": _hand_area(points),
            }
        )

    if not candidates:
        return None

    side_hint = side_hint.lower().strip()
    if side_hint in ("left", "right"):
        matching = [c for c in candidates if c["label"] == side_hint]
        if matching:
            return max(matching, key=lambda c: c["area"] * 2.0 + c["score"])

    return max(candidates, key=lambda c: c["area"] * 2.0 + c["score"])


def _confidence_for_line(
    start: tuple[float, float],
    end: tuple[float, float],
    palm_width: float,
    hand_score: float,
    bias: float,
) -> float:
    length_norm = min(1.0, _dist(start, end) / max(0.08, palm_width * 1.1))
    score = 0.42 + hand_score * 0.33 + length_norm * 0.18 + bias
    return round(_clamp01(min(0.98, score)), 3)


def _snap_point_to_edges(
    edges: np.ndarray,
    p: tuple[float, float],
    radius_px: int,
    bounds: tuple[int, int, int, int],
) -> tuple[tuple[float, float], bool]:
    h, w = edges.shape
    cx = int(max(0, min(w - 1, round(p[0] * w))))
    cy = int(max(0, min(h - 1, round(p[1] * h))))

    min_x, min_y, max_x, max_y = bounds
    x1 = max(min_x, cx - radius_px)
    x2 = min(max_x, cx + radius_px)
    y1 = max(min_y, cy - radius_px)
    y2 = min(max_y, cy + radius_px)
    if x2 <= x1 or y2 <= y1:
        return p, False

    roi = edges[y1 : y2 + 1, x1 : x2 + 1]
    ys, xs = np.where(roi > 0)
    if xs.size == 0:
        return p, False

    local_cx = cx - x1
    local_cy = cy - y1
    dist2 = (xs - local_cx) ** 2 + (ys - local_cy) ** 2
    idx = int(np.argmin(dist2))
    sx = int(x1 + xs[idx])
    sy = int(y1 + ys[idx])
    return (sx / float(w), sy / float(h)), True


def _snap_curve_to_edges(
    edges: np.ndarray,
    curve: tuple[tuple[float, float], tuple[float, float], tuple[float, float]],
    bounds: tuple[int, int, int, int],
    radii: tuple[int, int, int],
) -> tuple[
    tuple[tuple[float, float], tuple[float, float], tuple[float, float]],
    float,
]:
    p0, p1, p2 = curve
    s0, ok0 = _snap_point_to_edges(edges, p0, radii[0], bounds)
    s1, ok1 = _snap_point_to_edges(edges, p1, radii[1], bounds)
    s2, ok2 = _snap_point_to_edges(edges, p2, radii[2], bounds)
    success = (1.0 if ok0 else 0.0) + (1.0 if ok1 else 0.0) + (1.0 if ok2 else 0.0)
    return (s0, s1, s2), success / 3.0


def detect(payload: dict[str, Any]) -> dict[str, Any]:
    landmarker = _create_landmarker()
    if landmarker is None:
        return _no_palm("mediapipe_unavailable")

    image = _decode_image(payload.get("image", ""))
    side_hint = str(payload.get("side", "")).lower().strip()

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    try:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_image)
    finally:
        landmarker.close()

    chosen = _select_hand(result, side_hint)
    if chosen is None:
        return _no_palm("no_hand_landmarks")
    if chosen["area"] < 0.02:
        return _no_palm("hand_too_small")

    lm = chosen["points"]
    hand_score = max(0.45, min(0.98, float(chosen["score"])))

    wrist = lm[WRIST]
    thumb_cmc = lm[THUMB_CMC]
    thumb_mcp = lm[THUMB_MCP]
    index_mcp = lm[INDEX_MCP]
    middle_mcp = lm[MIDDLE_MCP]
    ring_mcp = lm[RING_MCP]
    pinky_mcp = lm[PINKY_MCP]

    thumb_left = thumb_mcp[0] < pinky_mcp[0]
    palm_width = max(_dist(index_mcp, pinky_mcp), 0.12)
    palm_top_y = min(index_mcp[1], middle_mcp[1], ring_mcp[1], pinky_mcp[1])
    palm_bottom_y = max(wrist[1], index_mcp[1], middle_mcp[1], ring_mcp[1], pinky_mcp[1])
    palm_height = max(abs(palm_bottom_y - palm_top_y), 0.18)
    bulge_sign = -1.0 if thumb_left else 1.0
    palm_center_x = (index_mcp[0] + middle_mcp[0] + ring_mcp[0] + pinky_mcp[0]) / 4.0

    ulnar_top = _blend(ring_mcp, pinky_mcp, 0.52)
    radial_top = _blend(index_mcp, middle_mcp, 0.58)
    thumb_web = _blend(index_mcp, thumb_mcp, 0.56)
    ulnar_mid = (pinky_mcp[0], palm_top_y + 0.46 * palm_height)
    radial_low = _blend(wrist, thumb_cmc, 0.48)

    heart_start = _offset(ulnar_top, 0.0, 0.055 * palm_height)
    heart_end = _offset(radial_top, 0.0, 0.11 * palm_height)
    heart_mid = _offset(_blend(heart_start, heart_end, 0.5), 0.0, -0.08 * palm_height)

    head_start = _offset(thumb_web, 0.0, 0.085 * palm_height)
    head_end = _offset(ulnar_mid, 0.0, 0.055 * palm_height)
    head_mid = _offset(_blend(head_start, head_end, 0.5), 0.0, -0.015 * palm_height)

    life_start = _offset(thumb_web, 0.0, 0.02 * palm_height)
    life_end = _offset(radial_low, 0.0, 0.115 * palm_height)
    life_mid = _offset(_blend(life_start, life_end, 0.5), bulge_sign * 0.18 * palm_width, 0.04 * palm_height)

    fate_start = _offset((palm_center_x, wrist[1]), 0.0, -0.02 * palm_height)
    fate_end = _offset((palm_center_x, palm_top_y), 0.0, 0.16 * palm_height)
    fate_mid = _offset(_blend(fate_start, fate_end, 0.5), bulge_sign * 0.03 * palm_width, 0.0)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 48, 140)

    min_x = max(0, int((min(p[0] for p in lm) - 0.08) * image.shape[1]))
    max_x = min(image.shape[1] - 1, int((max(p[0] for p in lm) + 0.08) * image.shape[1]))
    min_y = max(0, int((min(p[1] for p in lm) - 0.08) * image.shape[0]))
    max_y = min(image.shape[0] - 1, int((max(p[1] for p in lm) + 0.1) * image.shape[0]))
    bounds = (min_x, min_y, max_x, max_y)
    r_main = max(6, int(0.035 * min(image.shape[0], image.shape[1])))
    r_mid = max(4, int(r_main * 0.75))

    heart_curve, heart_snap = _snap_curve_to_edges(
        edges,
        (heart_start, heart_mid, heart_end),
        bounds,
        (r_main, r_mid, r_main),
    )
    head_curve, head_snap = _snap_curve_to_edges(
        edges,
        (head_start, head_mid, head_end),
        bounds,
        (r_main, r_mid, r_main),
    )
    life_curve, life_snap = _snap_curve_to_edges(
        edges,
        (life_start, life_mid, life_end),
        bounds,
        (r_main, r_mid, r_main),
    )
    fate_curve, fate_snap = _snap_curve_to_edges(
        edges,
        (fate_start, fate_mid, fate_end),
        bounds,
        (r_main, r_mid, r_main),
    )

    lines = {
        "heart": [_pt(heart_curve[0]), _pt(heart_curve[1]), _pt(heart_curve[2])],
        "head": [_pt(head_curve[0]), _pt(head_curve[1]), _pt(head_curve[2])],
        "life": [_pt(life_curve[0]), _pt(life_curve[1]), _pt(life_curve[2])],
        "fate": [_pt(fate_curve[0]), _pt(fate_curve[1]), _pt(fate_curve[2])],
    }

    confidence = {
        "heart": min(0.98, _confidence_for_line(heart_curve[0], heart_curve[2], palm_width, hand_score, 0.03) + heart_snap * 0.08),
        "head": min(0.98, _confidence_for_line(head_curve[0], head_curve[2], palm_width, hand_score, 0.02) + head_snap * 0.08),
        "life": min(0.98, _confidence_for_line(life_curve[0], life_curve[2], palm_width, hand_score, 0.04) + life_snap * 0.08),
        "fate": min(0.98, _confidence_for_line(fate_curve[0], fate_curve[2], palm_width, hand_score, -0.01) + fate_snap * 0.08),
    }

    return {"hasPalm": True, "lines": lines, "confidence": confidence}


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        _emit(detect(payload))
        return 0
    except Exception as exc:  # pragma: no cover
        _emit(_no_palm(f"detector_exception:{type(exc).__name__}"))
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
