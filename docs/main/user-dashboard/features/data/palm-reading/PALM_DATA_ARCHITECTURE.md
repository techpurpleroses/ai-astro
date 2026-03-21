# Palm Reading — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Palm Reading feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

The Palm Reading feature uses a camera-based scanner (Roboflow + MediaPipe) to detect palm lines and produce a reading. It lives at `/features/palm-reading`.

---

## Data Flows

### Flow A — Preview Metrics (editorial)

The `PalmReadingClient` landing page shows four static metric bars (Sensitivity, Longevity, Intelligence, Ambition) as a preview of what a reading looks like. These are hardcoded editorial content.

```
PalmReadingClient (palm-reading-page.tsx)
  └─ METRICS constant (hardcoded editorial values)
       → MetricBar components (78, 85, 92, 71)
```

### Flow B — Live Palm Scan (Roboflow)

When the user taps "Scan Your Palm", the full scanner pipeline runs:

```
PalmCameraScanner (palm-camera-scanner.tsx)
  ├─ Camera / image upload
  ├─ MediaPipe HandLandmarker (client-side, WASM)
  │    └─ Palm validation (coverage, spread, brightness, sharpness)
  ├─ POST /api/palm/scan
  │    └─ Roboflow line detection → line coordinates (heart/head/life/fate)
  └─ POST /api/palm/interpret
       └─ Line analysis → scores + interpretation text
```

---

## Components

### `PalmReadingClient`
`src/components/features/palm-reading/palm-reading-page.tsx`

- Renders static preview metrics (hardcoded `METRICS` constant)
- Renders hand illustration (left/right toggle)
- "Scan Your Palm" CTA opens `PalmCameraScanner` in a full-screen modal

### `PalmCameraScanner`
`src/components/features/palm-reading/palm-camera-scanner.tsx`

Props: `hand: 'left' | 'right'`, `onClose: () => void`

Scanner phases: `intro → camera → scanning → drawing → results → error`

MediaPipe validation thresholds:
- Min palm coverage: 11% of frame
- Min palm height ratio: 42%
- Min finger spread: 12%
- Min brightness: 60
- Min contrast: 24
- Min sharpness: 10

---

## Endpoints

### `POST /api/palm/scan`
`src/app/api/palm/scan/route.ts`

**Auth:** Required. Gates on `palm.scan` entitlement.

**Request:** `{ image: string (base64 dataUrl), hand: 'left' | 'right', clientId: string }`

**Returns:** `PalmScanRecord` — detected line coordinates in normalized [0,1] space:
```json
{
  "heart": [[x, y], ...],
  "head":  [[x, y], ...],
  "life":  [[x, y], ...],
  "fate":  [[x, y], ...]
}
```

**Backend:** Roboflow model → line detection.

### `POST /api/palm/interpret`
`src/app/api/palm/interpret/route.ts`

**Auth:** Required. Gates on `palm.scan` entitlement. Rate limited.

**Request:** `PalmScanRecord` (line coordinates from scan)

**Returns:** Interpretation per line — scores (0–100) + reading text.

---

## Scan Result Types

```typescript
// src/lib/palm/contracts.ts
interface PalmScanRecord {
  heart: [number, number][]
  head:  [number, number][]
  life:  [number, number][]
  fate:  [number, number][]
}
```

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Preview metric bars | No gate — editorial preview |
| Palm scan (`POST /api/palm/scan`) | `palm.scan` entitlement (server-side) |
| Palm interpretation (`POST /api/palm/interpret`) | `palm.scan` entitlement (server-side) |

---

## Asset Dependencies

| Asset | Path |
|---|---|
| Left hand illustration | `/assets/palm-scan/left-hand.png` |
| Right hand illustration | `/assets/palm-scan/right-hand.png` |
| MediaPipe WASM runtime | `/mediapipe-wasm/` |
| MediaPipe hand model | `/mediapipe-wasm/hand_landmarker.task` |

---

*The Roboflow palm scan pipeline is production-grade. The preview metrics on the landing page are intentional editorial content.*
