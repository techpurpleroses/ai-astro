# Palm API Contracts (Phase 1)

This document defines the production-baseline API contracts now implemented for palm scanning.

## Storage model

- Scan results are stored as JSON files under `data/palm-readings/{clientId}/{scanId}.json`.
- This is a DB-free phase. Schema is versioned by TypeScript/Zod contracts in `src/lib/palm/contracts.ts`.

## Endpoints

### `POST /api/palm/detect`

Detects palm lines only.

Request:

```json
{
  "image": "data:image/jpeg;base64,...",
  "side": "left"
}
```

Response (success):

```json
{
  "hasPalm": true,
  "lines": {
    "heart": [[0.1, 0.3], [0.5, 0.25], [0.9, 0.2]],
    "head": [[0.15, 0.45], [0.5, 0.42], [0.92, 0.4]],
    "life": [[0.45, 0.1], [0.22, 0.55], [0.3, 0.9]],
    "fate": [[0.52, 0.92], [0.51, 0.55], [0.5, 0.15]]
  },
  "confidence": {
    "heart": 0.82,
    "head": 0.8,
    "life": 0.87,
    "fate": 0.74
  },
  "model": {
    "provider": "openai",
    "name": "gpt-4o"
  }
}
```

Response (no palm, HTTP `422`):

```json
{
  "hasPalm": false,
  "reason": "no_palm",
  "model": {
    "provider": "openai",
    "name": "gpt-4o"
  }
}
```

### `POST /api/palm/interpret`

Computes deterministic palm scores and text from detected geometry.

Request:

```json
{
  "side": "right",
  "lines": {
    "heart": [[0.1, 0.3], [0.5, 0.25], [0.9, 0.2]],
    "head": [[0.15, 0.45], [0.5, 0.42], [0.92, 0.4]],
    "life": [[0.45, 0.1], [0.22, 0.55], [0.3, 0.9]],
    "fate": [[0.52, 0.92], [0.51, 0.55], [0.5, 0.15]]
  },
  "confidence": {
    "heart": 0.82,
    "head": 0.8,
    "life": 0.87,
    "fate": 0.74
  }
}
```

Response:

```json
{
  "core": {
    "lineScore": {
      "heart": 83,
      "head": 79,
      "life": 88,
      "fate": 76
    },
    "lineSuggestion": {
      "heart": "Strong emotional clarity with healthy boundaries in relationships.",
      "head": "Practical thinker with stable decision-making under pressure.",
      "life": "High vitality signature with strong resilience in transitions.",
      "fate": "Steady ambition profile with gradual and reliable progress."
    }
  },
  "insights": {
    "emotionalType": "Intuitive Connector",
    "cognitiveStyle": "Practical Analyst",
    "vitality": "High Endurance",
    "careerFocus": "Steady Climber"
  },
  "lines": {
    "heart": { "score": 83, "summary": "...", "metrics": { "length": 5.21, "depth": 0.82, "curvature": 0.42 } },
    "head": { "score": 79, "summary": "...", "metrics": { "length": 5.02, "depth": 0.8, "curvature": 0.28 } },
    "life": { "score": 88, "summary": "...", "metrics": { "length": 6.91, "depth": 0.87, "curvature": 0.56 } },
    "fate": { "score": 76, "summary": "...", "metrics": { "length": 4.6, "depth": 0.74, "curvature": 0.19 } }
  }
}
```

### `POST /api/palm/scan`

Full pipeline: detect -> interpret -> persist JSON.

Request:

```json
{
  "clientId": "66d4bde0-d799-4b13-96b0-a2ab72a5ce41",
  "side": "left",
  "image": "data:image/jpeg;base64,..."
}
```

Response:

```json
{
  "scanId": "5140b8eb-d1c1-4fdb-8f00-c0af8f727f4f",
  "clientId": "66d4bde0-d799-4b13-96b0-a2ab72a5ce41",
  "side": "left",
  "createdAt": "2026-03-02T12:40:10.511Z",
  "detect": { "...": "same as /detect success" },
  "interpret": { "...": "same as /interpret response" }
}
```

### `GET /api/palm/history?clientId={id}&limit=10`

Returns recent scans for a client.

Response:

```json
{
  "items": [
    {
      "scanId": "5140b8eb-d1c1-4fdb-8f00-c0af8f727f4f",
      "side": "left",
      "createdAt": "2026-03-02T12:40:10.511Z",
      "lineScore": {
        "heart": 83,
        "head": 79,
        "life": 88,
        "fate": 76
      },
      "insights": {
        "emotionalType": "Intuitive Connector",
        "cognitiveStyle": "Practical Analyst",
        "vitality": "High Endurance",
        "careerFocus": "Steady Climber"
      }
    }
  ]
}
```

## Backward compatibility

- Existing `POST /api/palm-detect` is preserved and now returns legacy shape:
  - success: `{ heart, head, life, fate }`
  - no palm: `{ error: "no_palm", details: {...} }`
