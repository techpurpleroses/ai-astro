#!/usr/bin/env python3
"""Palm line detection via Roboflow Inference SDK.

Reads JSON from stdin:
{
  "image": "data:image/jpeg;base64,...",
  "side": "left" | "right" (optional),
  "imageWidth": 1080 (optional),
  "imageHeight": 1920 (optional)
}

Writes JSON to stdout:
{
  "hasPalm": true|false,
  "reason": "...",                 # only when hasPalm=false
  "lines": {
    "heart": [[x,y], ...],
    "head": [[x,y], ...],
    "life": [[x,y], ...],
    "fate": [[x,y], ...]
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
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from inference_sdk import InferenceHTTPClient


LINE_IDS = ("heart", "head", "life", "fate")


@dataclass
class Candidate:
    label: str
    points: list[tuple[float, float]]
    confidence: float
    avg_x: float
    avg_y: float
    span_x: float
    span_y: float
    verticality: float
    curvature: float


def _emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _no_palm(reason: str) -> dict[str, Any]:
    return {"hasPalm": False, "reason": reason}


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, float(v)))


def _norm_point(x: float, y: float, width: int, height: int) -> list[float]:
    if width <= 0 or height <= 0:
        return [0.0, 0.0]
    return [round(_clamp01(x / width), 4), round(_clamp01(y / height), 4)]


def _decode_data_url_image(data_url: str) -> bytes:
    if not isinstance(data_url, str) or "," not in data_url:
        raise ValueError("invalid_data_url")
    payload = data_url.split(",", 1)[1]
    return base64.b64decode(payload, validate=False)


def _infer_jpeg_png_size(raw: bytes) -> tuple[int, int] | None:
    if len(raw) < 24:
        return None

    # PNG
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        w = int.from_bytes(raw[16:20], "big", signed=False)
        h = int.from_bytes(raw[20:24], "big", signed=False)
        if w > 0 and h > 0:
            return w, h

    # JPEG
    if raw[0:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(raw):
            if raw[i] != 0xFF:
                i += 1
                continue
            marker = raw[i + 1]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h = int.from_bytes(raw[i + 5 : i + 7], "big", signed=False)
                w = int.from_bytes(raw[i + 7 : i + 9], "big", signed=False)
                if w > 0 and h > 0:
                    return w, h
                return None
            seg_len = int.from_bytes(raw[i + 2 : i + 4], "big", signed=False)
            if seg_len < 2:
                break
            i += 2 + seg_len
    return None


def _sanitize_label(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", label.strip().lower())


def _map_label(label: str) -> str | None:
    s = _sanitize_label(label)
    if not s:
        return None
    if "heart" in s:
        return "heart"
    if "head" in s or "mind" in s:
        return "head"
    if "life" in s or "longevity" in s:
        return "life"
    if "fate" in s or "career" in s or "destiny" in s:
        return "fate"
    return None


def _line_length(points: list[tuple[float, float]]) -> float:
    if len(points) < 2:
        return 0.0
    total = 0.0
    for i in range(len(points) - 1):
        dx = points[i + 1][0] - points[i][0]
        dy = points[i + 1][1] - points[i][1]
        total += math.hypot(dx, dy)
    return total


def _curvature(points: list[tuple[float, float]]) -> float:
    if len(points) < 3:
        return 0.0
    start = points[0]
    mid = points[len(points) // 2]
    end = points[-1]
    vx = end[0] - start[0]
    vy = end[1] - start[1]
    denom = math.hypot(vx, vy)
    if denom <= 1e-6:
        return 0.0
    numer = abs(vy * mid[0] - vx * mid[1] + end[0] * start[1] - end[1] * start[0])
    return numer / denom


def _sample_polyline(points: list[tuple[float, float]], target: int = 12) -> list[tuple[float, float]]:
    if len(points) <= target:
        return points
    out: list[tuple[float, float]] = []
    step = (len(points) - 1) / float(max(1, target - 1))
    for i in range(target):
        idx = int(round(i * step))
        out.append(points[idx])
    return out


def _interpolate(a: tuple[float, float], b: tuple[float, float], n: int) -> list[tuple[float, float]]:
    if n <= 1:
        return [a]
    out: list[tuple[float, float]] = []
    for i in range(n):
        t = i / float(n - 1)
        out.append((a[0] * (1.0 - t) + b[0] * t, a[1] * (1.0 - t) + b[1] * t))
    return out


def _extract_points(pred: dict[str, Any]) -> list[tuple[float, float]]:
    keypoints = pred.get("keypoints")
    points: list[tuple[float, float]] = []
    if isinstance(keypoints, list):
        for kp in keypoints:
            if isinstance(kp, dict):
                x = kp.get("x")
                y = kp.get("y")
                if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                    points.append((float(x), float(y)))
            elif isinstance(kp, (list, tuple)) and len(kp) >= 2:
                x = kp[0]
                y = kp[1]
                if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                    points.append((float(x), float(y)))

    if len(points) >= 2:
        return points

    x = pred.get("x")
    y = pred.get("y")
    w = pred.get("width")
    h = pred.get("height")
    if all(isinstance(v, (int, float)) for v in (x, y, w, h)):
        x = float(x)
        y = float(y)
        w = float(w)
        h = float(h)
        left = x - w / 2.0
        right = x + w / 2.0
        top = y - h / 2.0
        bottom = y + h / 2.0
        # For bbox-only output, create a line across major axis.
        if h >= w:
            return _interpolate((x, bottom), (x, top), 8)
        return _interpolate((left, y), (right, y), 8)
    return []


def _orient_points(points: list[tuple[float, float]], line_id: str) -> list[tuple[float, float]]:
    if len(points) < 2:
        return points
    first = points[0]
    last = points[-1]
    if line_id == "fate":
        # wrist -> up
        return points if first[1] >= last[1] else list(reversed(points))
    if line_id == "life":
        # upper start -> downward curve
        return points if first[1] <= last[1] else list(reversed(points))
    # heart/head left -> right
    return points if first[0] <= last[0] else list(reversed(points))


def _build_candidate(pred: dict[str, Any], width: int, height: int) -> Candidate | None:
    raw_pts = _extract_points(pred)
    if len(raw_pts) < 2 or width <= 0 or height <= 0:
        return None
    pts_norm = [(_clamp01(x / width), _clamp01(y / height)) for x, y in raw_pts]
    pts_norm = _sample_polyline(pts_norm, 12)
    xs = [p[0] for p in pts_norm]
    ys = [p[1] for p in pts_norm]
    span_x = max(xs) - min(xs)
    span_y = max(ys) - min(ys)
    conf = pred.get("confidence", 0.5)
    confidence = float(conf) if isinstance(conf, (int, float)) else 0.5
    label = str(pred.get("class", "") or "")
    return Candidate(
        label=label,
        points=pts_norm,
        confidence=max(0.0, min(1.0, confidence)),
        avg_x=sum(xs) / len(xs),
        avg_y=sum(ys) / len(ys),
        span_x=span_x,
        span_y=span_y,
        verticality=span_y / (span_x + 1e-6),
        curvature=_curvature(pts_norm),
    )


def _assign_by_geometry(candidates: list[Candidate], side_hint: str) -> dict[str, Candidate]:
    if not candidates:
        return {}
    remaining = candidates[:]

    fate = max(remaining, key=lambda c: c.verticality * 1.2 + c.span_y - c.span_x * 0.25)
    remaining = [c for c in remaining if c is not fate]

    thumb_target = 0.68 if side_hint == "left" else 0.32 if side_hint == "right" else 0.5
    if remaining:
        life = max(
            remaining,
            key=lambda c: (1.0 - abs(c.avg_x - thumb_target)) * 0.9
            + c.curvature * 1.5
            + c.span_y * 0.35
            - c.verticality * 0.1,
        )
        remaining = [c for c in remaining if c is not life]
    else:
        life = fate

    heart = None
    head = None
    if len(remaining) >= 2:
        sorted_by_y = sorted(remaining, key=lambda c: c.avg_y)
        heart = sorted_by_y[0]
        head = sorted_by_y[1]
    elif len(remaining) == 1:
        only = remaining[0]
        # Decide heart vs head by vertical position.
        if only.avg_y < 0.43:
            heart = only
        else:
            head = only

    out: dict[str, Candidate] = {"fate": fate, "life": life}
    if heart is not None:
        out["heart"] = heart
    if head is not None:
        out["head"] = head
    return out


def _map_predictions_to_lines(predictions: list[dict[str, Any]], width: int, height: int, side_hint: str) -> dict[str, Any]:
    by_label: dict[str, Candidate] = {}
    unlabeled: list[Candidate] = []

    for pred in predictions:
        cand = _build_candidate(pred, width, height)
        if cand is None:
            continue
        mapped = _map_label(cand.label)
        if mapped is None:
            unlabeled.append(cand)
            continue
        current = by_label.get(mapped)
        if current is None or cand.confidence > current.confidence:
            by_label[mapped] = cand

    if len(by_label) < 3 and unlabeled:
        geom_assign = _assign_by_geometry(unlabeled + list(by_label.values()), side_hint)
        for line_id, cand in geom_assign.items():
            if line_id not in by_label:
                by_label[line_id] = cand

    lines_out: dict[str, list[list[float]]] = {k: [] for k in LINE_IDS}
    conf_out: dict[str, float] = {k: 0.25 for k in LINE_IDS}

    for line_id in LINE_IDS:
        cand = by_label.get(line_id)
        if cand is None:
            continue
        oriented = _orient_points(cand.points, line_id)
        sampled = _sample_polyline(oriented, 12)
        lines_out[line_id] = [[round(_clamp01(x), 4), round(_clamp01(y), 4)] for x, y in sampled]
        conf_out[line_id] = round(max(0.0, min(1.0, cand.confidence)), 3)

    return {"lines": lines_out, "confidence": conf_out}


def detect(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = (os.getenv("ROBOFLOW_API_KEY") or "").strip()
    model_id = (os.getenv("ROBOFLOW_MODEL_ID") or "palm-lines-recognition-wemy5/1").strip()
    if not api_key:
        return _no_palm("roboflow_api_key_missing")

    image_data = payload.get("image", "")
    raw = _decode_data_url_image(image_data)
    inferred = _infer_jpeg_png_size(raw)
    width = int(payload.get("imageWidth") or (inferred[0] if inferred else 0))
    height = int(payload.get("imageHeight") or (inferred[1] if inferred else 0))
    if width <= 0 or height <= 0:
        return _no_palm("invalid_image_dimensions")

    side_hint = str(payload.get("side", "") or "").strip().lower()

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(raw)
        temp_path = Path(tmp.name)

    try:
        client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=api_key,
        )
        result = client.infer(str(temp_path), model_id=model_id)
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass

    predictions = result.get("predictions", [])
    if not isinstance(predictions, list) or not predictions:
        return _no_palm("no_predictions")

    mapped = _map_predictions_to_lines(
        predictions=[p for p in predictions if isinstance(p, dict)],
        width=width,
        height=height,
        side_hint=side_hint,
    )

    lines = mapped["lines"]
    major_count = sum(1 for k in ("heart", "head", "life") if len(lines[k]) >= 4)
    if major_count < 2:
        return _no_palm("major_lines_missing")

    return {
        "hasPalm": True,
        "lines": lines,
        "confidence": mapped["confidence"],
    }


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
