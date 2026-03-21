# Compatibility Tab — Data Architecture

> Describes every data source, hook, endpoint, and DB table that powers the Compatibility tab.
>
> **Status as of 2026-03-21**

---

## Page Overview

The Compatibility tab (`/compatibility`) has three surfaces:

| Surface | Route | Content |
|---|---|---|
| **Main page** | `/compatibility` | Soulmate card, sign selector + live pair report, Best Matches carousel, Today's Matches section |
| **Best Matches** | `/compatibility/best-matches` | Sign grid selector → top compatible signs for selected sign |
| **Today's Matches** | `/compatibility/today-matches` | 4-category tabs (Love/Career/Friendship/Sex) with featured pairs |

---

## Data Flows

The tab has **two distinct data flows** that must not be confused:

### Flow A — Live Per-Pair Report (the score ring)

**Hook:** `useCompatibilityPair(signA, signB)`

```typescript
useQuery<CompatibilityScore | null>({
  queryKey: ['compatibility-pair', signA, signB],
  queryFn: () => astroFetch(`/api/astro/compatibility?signA=...&signB=...`),
  enabled: !!signA && !!signB,
  staleTime: 30 * 24 * 60 * 60 * 1000,  // 30 days
})
```

- Calls `GET /api/astro/compatibility` — requires `compatibility.deep` entitlement
- Uses `CompatibilityService.getCompatibility()` via `resolveCacheFirst` pattern
- Cached in `astro_core.compatibility_snapshots` (30-day TTL)
- Used by: `CompatibilityReport` component (score ring, category bars, strengths/challenges)

### Flow B — Editorial Content (best matches + today's matches)

**Hook:** `useCompatibility()`

```typescript
useQuery<CompatibilityData>({
  queryKey: ['compatibility'],
  queryFn: () => astroFetchJson('/api/dashboard/compatibility'),
  staleTime: 60 * 60 * 1000,  // 1h
})
```

- Calls `GET /api/dashboard/compatibility` — no auth required, same for all users
- Returns curated editorial content: `bestMatches`, `todaysMatches`
- Used by: `TodaysMatchesSection`, `BestMatchesPageClient`, `TodaysMatchesPageClient`

### Flow C — Today Tab Compatibility (separate)

**Hook:** `useTodayCompatibility()`

- Selector over `useToday()` — extracts `sections.compatibility` from the Today BFF
- Returns `bestMatches: string[]` (for user's sun sign) + `todaysMatches.love: ZodiacMatch[]`
- Used by: Today tab only — NOT used by the Compatibility tab

---

## Endpoints

### `GET /api/dashboard/compatibility`
`src/app/api/dashboard/compatibility/route.ts`

**Auth:** None required — editorial content, same for all users.

**Returns:**
```json
{
  "bestMatches": {
    "aries": ["Leo", "Sagittarius", "Gemini", "Aquarius"],
    "taurus": ["Virgo", "Capricorn", "Cancer", "Pisces"],
    ...all 12 signs
  },
  "todaysMatches": {
    "love":       [ { "sign1": "Scorpio", "sign2": "Cancer", "score": 97, "note": "..." } ],
    "career":     [ ... ],
    "friendship": [ ... ],
    "sex":        [ ... ]
  }
}
```

**Content source:** `src/data/compatibility.json` (curated, served server-side). The `pairs` field is stripped — per-pair scores are handled by the live `/api/astro/compatibility` endpoint.

---

### `GET /api/astro/compatibility?signA=...&signB=...`
`src/app/api/astro/compatibility/route.ts`

**Auth:** Required. Gates on `compatibility.deep` entitlement (returns soft-paywall at 200 if not entitled).

**Returns:** `ApiEnvelope<CompatibilityDTO>` — `{ data: { overall, love, career, friendship, sex, summary, strengths, challenges }, meta }`.

**Backend:** `CompatibilityService.getCompatibility()` via `resolveCacheFirst`:
1. Check `astro_core.compatibility_snapshots` for fresh entry
2. On miss: call `AstrologyApiIoAstroAiGateway.fetchCompatibility()` → provider API
3. Store result, return response

**TTL:** 30 days — compatibility between two signs does not change over time.

---

## User Personalization: `sign1` Default

The main compatibility page (`CompatibilityClient`) initializes `sign1` from the user's profile:

```typescript
const { data: profile } = useUserProfile()

const defaultSign1 = useMemo(() => {
  if (!profile?.sunSign || profile.isPlaceholder) return 'Scorpio'
  return profile.sunSign.charAt(0).toUpperCase() + profile.sunSign.slice(1)
}, [profile?.sunSign, profile?.isPlaceholder])

const [sign1, setSign1] = useState<string | null>(null)
const effectiveSign1 = sign1 ?? defaultSign1  // user's sun sign until overridden
```

- `effectiveSign1` is the user's sun sign on first load
- Once the user taps a different sign (carousel or selector), `sign1` state overrides
- If user has no birth data (`isPlaceholder: true`), defaults to 'Scorpio'

---

## Database

### `astro_core.compatibility_snapshots`

| Column | Type | Description |
|---|---|---|
| `sign_a` | text | First sign (normalized lowercase) |
| `sign_b` | text | Second sign (normalized lowercase) |
| `system_type` | text | `'western'` |
| `overall` | int | 0–100 overall score |
| `love` | int | Love dimension score |
| `career` | int | Career dimension score |
| `friendship` | int | Friendship dimension score |
| `sex` | int | Intimacy dimension score |
| `summary` | text | Provider-generated summary text |
| `strengths_json` | jsonb | Array of strength strings |
| `challenges_json` | jsonb | Array of challenge strings |
| `computed_at` | timestamptz | When computed |
| `expires_at` | timestamptz | Cache TTL (30 days) |
| `provider_meta` | jsonb | Source provider info |

---

## Component Data Flow

```
Flow A — Live pair report:
  useCompatibilityPair(effectiveSign1, sign2)
    └─ GET /api/astro/compatibility?signA=...&signB=...
         ├─ entitlement check (compatibility.deep)
         └─ CompatibilityService.getCompatibility()
              ├─ astro_core.compatibility_snapshots (cache read)
              ├─ AstrologyApiIoClient.getCompatibilityScore()  (on miss)
              └─ astro_core.compatibility_snapshots (cache write)
         → CompatibilityReport (score ring + bars + strengths/challenges)

Flow B — Editorial content:
  useCompatibility()
    └─ GET /api/dashboard/compatibility
         → src/data/compatibility.json (server-side)
         → TodaysMatchesSection (4-category tab + pairs)
         → BestMatchesPageClient (sign grid + top matches)
         → TodaysMatchesPageClient (full today's matches)

Flow C — Today tab only:
  useTodayCompatibility()
    └─ selector over useToday() → sections.compatibility
         → Today tab BFF
```

---

## Entitlement Gating

| Feature | Gate | What's blocked |
|---|---|---|
| `CompatibilityReport` (score + details) | `FeatureGate feature="compatibility.deep"` | Score ring, category bars, summary, strengths/challenges |
| `useCompatibilityPair()` API call | `compatibility.deep` checked server-side in route | Returns `{ locked: true }` for free users |
| Best Matches page | No gate | Free feature |
| Today's Matches page | No gate | Free feature |

---

*This document should be updated when todaysMatches is computed dynamically from the provider.*
