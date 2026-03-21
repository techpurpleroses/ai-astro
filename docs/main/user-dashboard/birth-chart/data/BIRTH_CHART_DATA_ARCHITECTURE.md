# Birth Chart Tab — Data Architecture

> Describes every data source, hook, endpoint, and DB table that powers the Birth Chart tab.
>
> **Status as of 2026-03-21**

---

## Page Overview

The Birth Chart tab (`/birth-chart`) has two views toggled by `?view=chart|transits`:

| View | Content | Entitlement |
|---|---|---|
| **Your Chart** (default) | Chart wheel SVG, Big Three card, Planet Table, Stellar Composition | BigThree: free; PlanetTable + StellarComposition: `birth_chart.full` |
| **Daily Transits** | Date strip, transit cards (shortTerm/longTerm) | `birth_chart.full` gated by `FeatureGate` |

---

## Primary Hook

### `useBirthChart()`
`src/hooks/use-birth-chart.ts`

```typescript
useQuery<BirthChartData | null>({
  queryKey: ['birth-chart'],
  queryFn: () => astroFetchJson('/api/dashboard/birth-chart'),
  staleTime: 24 * 60 * 60 * 1000,  // 24h — fixed birth data
})
```

Returns `BirthChartData | null`. Returns `null` when the user has no birth data entered yet (`isPlaceholder: true`). Both `ChartView` and `TransitsView` call this hook independently (TanStack Query deduplicates).

**Cache invalidation:** `useUpdateProfile.onSuccess` invalidates `['birth-chart']` so re-fetching occurs whenever birth date/time/place is changed.

---

## BFF Endpoint

### `GET /api/dashboard/birth-chart`
`src/app/api/dashboard/birth-chart/route.ts`

**Auth:** Required. Returns 401 if unauthenticated.

**No-subject path:** If user has no primary subject or `is_placeholder = true`, returns `{ data: null, isPlaceholder: true }` with status 200.

**Happy path:**
1. Auth user via `getServerSupabaseClient()`
2. Look up primary subject from `identity.subjects` via service role
3. Call `birthChartService.getBirthChart({ userId, subjectId, chartType: 'natal', systemType: 'western' })`
4. Map `BirthChartDTO` → `BirthChartData` via inline mapper
5. Return `{ data: BirthChartData, meta: { freshnessStatus, cacheHit } }`

**Response shape:**
```json
{
  "data": {
    "bigThree": { "sun": {...}, "moon": {...}, "ascendant": {...} },
    "stellarComposition": { "fire": 2, "earth": 3, "air": 1, "water": 2, ... },
    "planets": [ { "name": "Sun", "sign": "Taurus", "house": 9, "degree": 24.46, ... } ],
    "houses":  [ { "number": 1, "sign": "Virgo", "degree": 19.70, ... } ],
    "aspects": [ { "planet1": "Sun", "planet2": "Moon", "type": "trine", "orb": 3.48 } ],
    "dailyTransits": { "shortTerm": [], "longTerm": [] }
  },
  "meta": { "freshnessStatus": "fresh", "cacheHit": true }
}
```

**Note:** `dailyTransits` always returns empty arrays in Phase 1. Transit data with interpretations requires a separate calculation endpoint (Phase 2).

---

## Underlying Service Stack

### `BirthChartService.getBirthChart()`
`src/server/products/astroai/modules/birth-chart/service.ts`

Uses `resolveCacheFirst` pattern:
1. Check `astro_core.chart_snapshots` for fresh entry (`expires_at > now`)
2. On miss/stale: call `AstrologyApiIoAstroAiGateway.fetchBirthChart()`
3. Store result back to `chart_snapshots`
4. Return `BirthChartResponse` with `meta.freshnessStatus` and `meta.cacheHit`

**TTL:** 180 days (birth chart is computed from static birth data — it never changes unless birth data changes).

---

## Data Mapper: `BirthChartDTO` → `BirthChartData`

The provider stores raw data. The BFF maps it to the frontend type:

| DTO field | Frontend field | Transformation |
|---|---|---|
| `bodies[i].name` | `planets[i].name` | String passthrough |
| `bodies[i].sign` | `planets[i].sign` | 3-letter abbrev → full name (`"Tau"` → `"Taurus"`) |
| `bodies[i].house` | `planets[i].house` | Number passthrough |
| `bodies[i].degree` | `planets[i].degree` | Rounded to 2dp |
| `bodies[i].absolute_longitude` | `planets[i].absoluteDegree` | Rounded to 4dp |
| `bodies[i].is_retrograde` | `planets[i].isRetrograde` | Boolean passthrough |
| — | `planets[i].glyph` | Looked up from `PLANET_GLYPHS` constant |
| — | `planets[i].description` | Template-generated: `"${name} in ${sign}, House ${house}. ..."` |
| `houses[i].house` | `houses[i].number` | Number passthrough |
| `houses[i].sign` | `houses[i].sign` | 3-letter abbrev → full name |
| `aspects[i].point1/point2` | `aspects[i].planet1/planet2` | String passthrough |
| `aspects[i].aspect_type` | `aspects[i].type` | Lowercased; falls back to "conjunction" |
| `aspects[i].orb` | `aspects[i].orb` | `Math.abs()`, rounded to 2dp |
| — | `bigThree.sun/moon/ascendant` | Derived from planets + house 1 |
| — | `stellarComposition` | Computed by counting planet signs into element/modality buckets |

---

## Provider: `AstrologyApiIoAstroAiGateway.fetchBirthChart()`
`src/server/products/astroai/provider/astrology-api-io-gateway.ts`

1. Loads `identity.subjects` row (birth_date, birth_time, birth_place_name, lat/lng)
2. Calls `AstrologyApiIoClient.getNatalChart()` with the birth data
3. Extracts `chart_data.planetary_positions` → `bodies[]`
4. Extracts `chart_data.house_cusps` → `houses[]`
5. Extracts `chart_data.aspects` → `aspects[]`
6. Pre-resolves `sunSign`, `moonSign`, `risingSign` to full names
7. Returns `BirthChartDTO`

---

## Database

### `astro_core.chart_snapshots`

| Column | Type | Description |
|---|---|---|
| `subject_id` | uuid | FK to `identity.subjects.id` |
| `user_id` | uuid | FK to `identity.subjects.user_id` |
| `chart_type` | text | `'natal'` |
| `system_type` | text | `'western'` |
| `zodiac_type` | text | `'tropical'` or `'sidereal'` |
| `house_system` | text | `'placidus'` |
| `sun_sign` | text | Full sign name |
| `moon_sign` | text | Full sign name or null |
| `rising_sign` | text | Full sign name or null |
| `bodies_json` | jsonb | Raw planetary positions array |
| `houses_json` | jsonb | Raw house cusps array |
| `aspects_json` | jsonb | Raw aspects array |
| `computed_at` | timestamptz | When the chart was computed |
| `expires_at` | timestamptz | Cache TTL (180 days after computation) |
| `provider_meta` | jsonb | Source provider key, latency, etc. |

### `identity.subjects`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Subject ID (subjectId) |
| `user_id` | uuid | Owning user |
| `is_primary` | boolean | True for the user's main birth chart subject |
| `is_placeholder` | boolean | True until user enters real birth data |
| `birth_date` | date | YYYY-MM-DD |
| `birth_time` | time | HH:MM:SS |
| `birth_place_name` | text | City, Country |
| `latitude` | float8 | Birth latitude (optional, for precise calc) |
| `longitude` | float8 | Birth longitude |
| `personalization_timezone` | text | IANA timezone |

---

## Component Data Flow

```
useBirthChart()
  └─ GET /api/dashboard/birth-chart
       ├─ identity.subjects  (get subjectId)
       └─ BirthChartService.getBirthChart()
            ├─ astro_core.chart_snapshots  (cache read)
            ├─ AstrologyApiIoClient.getNatalChart()  (on miss)
            └─ astro_core.chart_snapshots  (cache write)
       └─ mapDtoToFrontend(BirthChartDTO) → BirthChartData

BirthChartData consumed by:
  ├─ ChartWheelSVG          → planets[], houses[], aspects[]
  ├─ BigThreeCard            → bigThree.sun/moon/ascendant + house from planets[]
  ├─ PlanetTable             → planets[]          [birth_chart.full gate]
  ├─ StellarCompositionCard  → planets[]          [birth_chart.full gate]
  └─ TransitsView            → dailyTransits.*    [birth_chart.full gate — empty Phase 1]
```

---

## Cache Invalidation

| Trigger | Effect |
|---|---|
| `useUpdateProfile.onSuccess` | Invalidates `['birth-chart']` — refetch on next view |
| 24h staleTime in hook | Background refetch on next focus after 24h |
| 180-day server TTL in `chart_snapshots.expires_at` | Forces provider re-fetch when snapshot expires |

---

## BigThreeCard House Derivation

`BirthChartData.bigThree` does not include house numbers (it's a simplified type).
House numbers are derived at render time in `ChartView`:

```typescript
sun:       { ...data.bigThree.sun,       house: data.planets.find(p => p.name === 'Sun')?.house  ?? 0 }
moon:      { ...data.bigThree.moon,      house: data.planets.find(p => p.name === 'Moon')?.house ?? 0 }
ascendant: { ...data.bigThree.ascendant, house: 1 }  // Ascendant is always House 1
```

---

*This document should be updated when transit data is connected (Phase 2).*
