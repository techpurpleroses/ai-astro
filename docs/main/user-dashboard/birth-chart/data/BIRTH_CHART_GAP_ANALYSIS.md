# Birth Chart Tab — Gap Analysis vs Production Plan

> Compares the Birth Chart tab against production-readiness requirements.
> Every item is traceable to actual hook/component/service code.
>
> **Status as of 2026-03-21**

---

## Summary Verdict

The Birth Chart tab is **production-capable for the core chart display flow**. As of 2026-03-21 all blocking gaps are resolved:

| # | Gap | Status |
|---|---|---|
| 1 | `useBirthChart()` reads static JSON — never calls real API | ✅ Fixed |
| 2 | `BigThreeCard` hardcodes house numbers (9, 5, 1) | ✅ Fixed |
| 3 | `useUpdateProfile` doesn't invalidate `['birth-chart']` | ✅ Fixed |
| 4 | No `BirthChartDTO` → `BirthChartData` mapper existed | ✅ Fixed — mapper in BFF route |
| 5 | `dailyTransits` never populated from real data | ⏳ Deferred — needs transit interpretation endpoint |

---

## Gap-by-Gap Breakdown

---

### Gap 1 — `useBirthChart()` Never Called Real API ✅ FIXED

**What was happening:**

`src/hooks/use-birth-chart.ts`:
```typescript
queryFn: async () => {
  const data = await import('@/data/birth-chart.json')
  return data as unknown as BirthChartData
},
staleTime: Infinity,
gcTime: Infinity,
```

Every user saw the same static JSON data regardless of their actual birth date, time, or place. The `POST /api/astro/birth-chart` endpoint was fully built (with Supabase caching, provider call, entitlement check, rate limiting) but was never called from the frontend.

**What changed:**
- Created `GET /api/dashboard/birth-chart` BFF route (no entitlement gate — UI applies `FeatureGate`)
- `useBirthChart()` now calls `GET /api/dashboard/birth-chart` via `astroFetchJson`
- `staleTime` changed from `Infinity` to 24h (appropriate for fixed birth data)
- Returns `null` when user has no birth data (`isPlaceholder: true`)

---

### Gap 2 — `BigThreeCard` Hardcoded House Numbers ✅ FIXED

**What was happening:**

`src/components/birth-chart/big-three-card.tsx`:
```typescript
const entries: BigThreeEntry[] = [
  { planet: 'Sun',       ..., house: 9 },  // always 9
  { planet: 'Moon',      ..., house: 5 },  // always 5
  { planet: 'Ascendant', ..., house: 1 },  // always 1 (this one is correct)
]
```

Sun house and Moon house were hardcoded to the values from the static JSON fixture. Every user's Big Three showed "House 9" for Sun and "House 5" for Moon, regardless of their actual chart.

**What changed:**
- `BigThreeCardProps` now includes `house: number` in each entry
- `ChartView` in `birth-chart-page.tsx` derives house numbers from `data.planets[]`:
  ```typescript
  sun:  { ...data.bigThree.sun,  house: data.planets.find(p => p.name === 'Sun')?.house  ?? 0 }
  moon: { ...data.bigThree.moon, house: data.planets.find(p => p.name === 'Moon')?.house ?? 0 }
  ascendant: { ...data.bigThree.ascendant, house: 1 }
  ```
- Ascendant is always House 1 by definition — hardcode of `1` remains correct

---

### Gap 3 — Profile Update Didn't Invalidate Birth Chart ✅ FIXED

**What was happening:**

`src/hooks/use-profile.ts` `useUpdateProfile.onSuccess`:
```typescript
onSuccess: (data) => {
  queryClient.setQueryData(['user-profile'], data)
  void queryClient.invalidateQueries({ queryKey: ['today'] })
  // ['birth-chart'] was NOT invalidated
},
```

When a user updated their birth date or birth time in settings, the Birth Chart tab would continue showing the old (or static JSON) chart until the 24h staleTime expired. The cache-breaking signal was missing.

**What changed:**
- Added `void queryClient.invalidateQueries({ queryKey: ['birth-chart'] })` to `onSuccess`
- Chart now re-fetches on the next view after any birth data update

---

### Gap 4 — No `BirthChartDTO` → `BirthChartData` Mapper ✅ FIXED

**What was happening:**

`BirthChartDTO.bodies` contains raw provider data with 3-letter sign abbreviations:
```json
{ "name": "Sun", "sign": "Tau", "house": 9, "degree": 24.46, "is_retrograde": false }
```

`BirthChartData.planets` (frontend type) requires:
```typescript
{ name: string; sign: string; house: number; degree: number; glyph: string; description: string; ... }
```

No mapper existed. The backend service and BFF were disconnected — neither the `POST /api/astro/birth-chart` route nor any frontend code performed this mapping.

**What changed:**
Created mapper in `GET /api/dashboard/birth-chart/route.ts`:
- `expandSign()` converts 3-letter abbreviations to full names (`"Tau"` → `"Taurus"`)
- `mapBodies()` adds glyph from `PLANET_GLYPHS`, generates template description
- `mapHouses()` normalizes house number field
- `mapAspects()` normalizes aspect type, takes `Math.abs(orb)`
- `computeStellarComposition()` counts element/modality distribution from planet signs
- `mapDtoToFrontend()` assembles the final `BirthChartData`

---

### Gap 5 — `dailyTransits` Is Never Populated ⏳ DEFERRED

**What is happening:**

`BirthChartData.dailyTransits` has `shortTerm: Transit[]` and `longTerm: Transit[]`. `Transit` objects require:
- `id`, `transitingPlanet`, `natalPlanet`, `aspect`, `orb`, `startDate`, `endDate`
- `intensity: 'low' | 'medium' | 'high'`
- `title: string`, `interpretation: string`, `tags: string[]`

The `GET /api/dashboard/birth-chart` BFF always returns `{ shortTerm: [], longTerm: [] }`.

The `TransitsView` component is already gated behind `FeatureGate feature="birth_chart.full"` and renders nothing if arrays are empty (`{shortTerm.length > 0 && ...}`). No user-visible breakage today.

**What should happen (Phase 2):**
- Create a separate transits endpoint or expand the BFF to call a transit-specific provider call
- The provider's aspects endpoint can be called with the user's natal planets vs. current sky positions
- Map results to `Transit[]` with generated interpretation text (or LLM-generated)
- Or: source daily transits from the `Today` BFF's aspects data (already computed for the user's sun sign)

**Impact:** `TransitsView` shows no content for any user until this is implemented. The `Daily Transits` tab is effectively empty for all tiers.

---

## Secondary Issues (Non-Blocking)

### `POST /api/astro/birth-chart` Is Now Superseded

The `POST /api/astro/birth-chart` route has:
- Full entitlement check for `birth_chart.full`
- Global rate limiting
- Requires `subjectId` in request body

The new `GET /api/dashboard/birth-chart` BFF calls `birthChartService.getBirthChart()` directly (the same service layer) without the entitlement gate. The UI applies `FeatureGate` to guard the detailed sections. The `POST` route could be deprecated or kept for potential advisor-side or admin use.

### `src/data/birth-chart.json` Is Now Dead Code

The static fixture `src/data/birth-chart.json` is no longer imported by any hook or component. It was the seed fixture used by the old static-import pattern. It can be deleted or kept as a development/test reference.

### `BirthChartData.bigThree` Does Not Include House Numbers

The `bigThree` type in `src/types/index.ts` only has `{ sign, degree, glyph }` — no `house`. House numbers are derived at render time from `planets[]`. This works correctly but means `bigThree` is not self-contained. Adding `house?: number` to the type would be a clean-up item.

### Chart Wheel Shows Static Planet Positions

`ChartWheelSVG` receives real `planets[]`, `houses[]`, `aspects[]` from the live API — so the wheel is now personalized. No action needed.

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| Birth chart from Supabase cache (`astro_core.chart_snapshots`) | ✅ Live — 180-day TTL, provider call on miss |
| Planet positions, signs, houses, degrees | ✅ Live — from provider via mapper |
| 3-letter sign abbreviation expansion | ✅ Fixed — mapper in BFF route |
| Big Three card (Sun/Moon/Ascendant) | ✅ Live — with real house numbers |
| Planet Table (Mercury→Saturn) | ✅ Live — `PlanetPosition[]` from API |
| Stellar Composition card | ✅ Live — filtered from `planets[]` |
| `description` in planet detail sheet | ✅ Live — template-generated in mapper |
| `StellarComposition` element/modality counts | ✅ Computed from planet signs |
| `isPlaceholder: true` → `null` data | ✅ BFF returns `null`, UI shows BirthDataPrompt |
| Cache invalidation on profile update | ✅ Fixed — `useUpdateProfile.onSuccess` |
| `staleTime: 24h` (was Infinity) | ✅ Fixed |
| Daily Transits view | ⏳ Empty — `dailyTransits: { shortTerm: [], longTerm: [] }` |

---

## Complete Change Plan

### What was FIXED (2026-03-21)

| Gap | Change Made |
|---|---|
| Static JSON import | Created `GET /api/dashboard/birth-chart` BFF + updated `useBirthChart()` hook |
| No DTO → frontend mapper | `mapDtoToFrontend()` in BFF route with `expandSign`, `mapBodies`, `mapHouses`, `mapAspects`, `computeStellarComposition` |
| BigThreeCard hardcoded house numbers | `BigThreeCardProps` now accepts `house: number`; `ChartView` derives from `data.planets[]` |
| Missing cache invalidation | `useUpdateProfile.onSuccess` now invalidates `['birth-chart']` |

### What is DEFERRED

| Gap | Requirement |
|---|---|
| Daily transits with interpretations | Separate transit call against user's natal planets vs. current sky |

### What to ADD (future)

| Feature | Description |
|---|---|
| Daily Transits Phase 2 | Transit endpoint using natal chart vs. current planetary positions |
| Real-time transit updates | Transits change daily — consider 1h staleTime or invalidation at midnight |
| Personalized aspect interpretations | LLM-generated or static lookup for aspect type + planet combinations |
| Delete `src/data/birth-chart.json` | Now dead code — remove to avoid confusion |

---

## Layman Summary

**What was broken:**

1. **Wrong chart shown for every user** — the birth chart tab loaded a fake, hard-coded chart from a local JSON file. No matter what birth date a user entered, everyone saw the same chart.

2. **Wrong house numbers** — even if the chart had been real, the "Sun in Taurus, House 9" display hardcoded "House 9" regardless of the user's actual chart. Every user saw the same house numbers.

3. **Chart didn't update after profile change** — if a user corrected their birth date in settings, the chart tab would not update until much later, because the cache was never cleared.

**What's fixed:**
- The chart now fetches real data from the birth chart engine for each user's actual birth date, time, and place
- House numbers are real (Sun's house, Moon's house come from the computed chart)
- Changing birth data triggers a chart refresh

**What's still missing:**
- The **Daily Transits** tab shows nothing. The transit interpretation feature is half-built — the chart wheel and planet table work, but the transit cards have no data source yet.

---

*This document should be updated when transit data is connected (Phase 2).*
