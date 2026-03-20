# Onboarding Implementation

## Asset location
- Public assets are organized category-wise under:
  - `public/assets/onboarding/<category>/images`
  - `public/assets/onboarding/<category>/videos`
  - `public/assets/onboarding/<category>/audio`
  - `public/assets/onboarding/<category>/fonts`

Categories:
- `moon`
- `compatibility`
- `numerology`
- `palm-reading`
- `past-lives`
- `astrocartography`
- `sketch`

## Frontend routes
- Category picker: `/onboarding`
- Category flow: `/onboarding/[category]`

## Backend API
- `POST /api/onboarding/session` - create onboarding session
- `GET /api/onboarding/session/[sessionId]` - fetch session
- `PATCH /api/onboarding/session/[sessionId]` - update step/status/event
- `POST /api/onboarding/session/[sessionId]/answer` - save step answer
- `POST /api/onboarding/session/[sessionId]/complete` - mark complete
- `GET /api/onboarding/assets/report` - media and mapping validation report
- `GET /api/location/autocomplete?q=<text>&limit=<n>` - global location autosuggest (Mapbox)

## Storage
- Session files are stored under:
  - `data/onboarding-sessions`
- Override with env var:
  - `ONBOARDING_DATA_DIR`

## Notes
- Existing site typography is preserved; onboarding does not load custom font faces.
- Palm onboarding includes real detection check via existing `POST /api/palm/detect`.
- Birth-place step uses Mapbox autosuggest with short-lived in-memory cache to reduce query cost.
- Requires `MAPBOX_ACCESS_TOKEN` for autosuggest; manual city/country entry still works without it.
- Step-to-media mapping is deterministic per category via:
  - `src/lib/onboarding/media-map.ts`
