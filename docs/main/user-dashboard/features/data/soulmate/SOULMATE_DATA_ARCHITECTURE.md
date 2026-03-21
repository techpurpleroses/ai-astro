# Soulmate by Birth Chart — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Soulmate feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

The Soulmate by Birth Chart feature generates a cosmic soulmate profile for the user based on their natal chart. It lives at `/features/soulmate` (also accessible from the Compatibility tab CTA).

---

## Current Data Flow

```
SoulmateClient (soulmate-page.tsx)
  └─ No data fetch — all content is hardcoded
       → Hardcoded Big Three: "Scorpio Sun · Cancer Moon · Aquarius Rising"
       → Hardcoded soulmate profile: Capricorn/Pisces/Libra
       → Hardcoded timing: Oct 12–28, 2026 · Dec 3–20, 2026
       → Hardcoded strengths, connection type, compatibility aspects
```

---

## Intended Data Flow (Phase 2)

```
SoulmateClient
  ├─ useUserProfile()
  │    └─ GET /api/user/profile → { sunSign, moonSign, ascendantSign }
  └─ (optional) useSoulmateReport()
       └─ GET /api/dashboard/features/soulmate
            └─ Uses birth chart + transits to generate soulmate profile
                 → { soulmateProfile, connectionType, timingWindows, qualities }
```

---

## Component

### `SoulmateClient`
`src/components/features/soulmate/soulmate-page.tsx`

All content is hardcoded. The component renders:
- Soulmate sketch portrait (`/assets/soulmate-sketch.webp`)
- "Based on your Scorpio Sun · Cancer Moon · Aquarius Rising" subtitle
- Their Zodiac Profile: Capricorn Sun, Pisces Moon, Libra Rising
- Connection Type: "karmic soulmate bond"
- Timing: Jupiter transit Oct 12–28, 2026 · Dec 3–20, 2026
- Magnetic Qualities: 3 hardcoded bullet points
- Compatibility Aspects: Scorpio-Capricorn synastry description

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Soulmate portrait + intro | No gate — visible to all |
| Full soulmate profile + timing | `FeatureGate feature="soulmate.generate"` |

---

*This document should be updated when soulmate content is generated from the user's actual birth chart.*
