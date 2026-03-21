# Compatibility Tab — Gap Analysis vs Production Plan

> Compares the Compatibility tab against production-readiness requirements.
> Every item is traceable to actual hook/component/service code.
>
> **Status as of 2026-03-21**

---

## Summary Verdict

The Compatibility tab is **production-capable for the core compatibility report flow**. As of 2026-03-21 all blocking gaps are resolved:

| # | Gap | Status |
|---|---|---|
| 1 | `sign1` hardcoded to `'Scorpio'` — every user starts with the wrong sign | ✅ Fixed |
| 2 | `useCompatibility()` imports static JSON client-side — developer TODO | ✅ Fixed |
| 3 | `todaysMatches` and `bestMatches` are the same for all users, no personalization | ⏳ Deferred — editorial content is acceptable for v1 |

The per-pair live compatibility report (`useCompatibilityPair` → `GET /api/astro/compatibility`) was already production-grade before this session.

---

## Gap-by-Gap Breakdown

---

### Gap 1 — `sign1` Hardcoded to `'Scorpio'` ✅ FIXED

**What was happening:**

`src/components/compatibility/compatibility-page.tsx`:
```typescript
const [sign1, setSign1] = useState<string | null>('Scorpio')
```

Every user opened the Compatibility tab with Scorpio pre-selected as "Your Sign". Users with any other sun sign would immediately see the wrong compatibility — Scorpio's compatibility with whatever they select, not their own. For a Taurus user, `useCompatibilityPair('Scorpio', null)` fires and the selector shows "Scorpio" as their sign.

**What changed:**
- Added `useUserProfile()` to `CompatibilityClient`
- `defaultSign1` derived from `profile.sunSign` (capitalized); falls back to `'Scorpio'` while profile loads or if user has no birth data
- `sign1` state starts as `null` — `effectiveSign1 = sign1 ?? defaultSign1` is used everywhere
- Once the user taps a sign to change it, `setSign1(sign)` overrides `defaultSign1` for the session

```typescript
const defaultSign1 = useMemo(() => {
  if (!profile?.sunSign || profile.isPlaceholder) return 'Scorpio'
  return profile.sunSign.charAt(0).toUpperCase() + profile.sunSign.slice(1)
}, [profile?.sunSign, profile?.isPlaceholder])

const effectiveSign1 = sign1 ?? defaultSign1
```

---

### Gap 2 — `useCompatibility()` Imported Static JSON Client-Side ✅ FIXED

**What was happening:**

The developer left a TODO in the code:
```typescript
// useCompatibility — still used by the Compatibility page (reads static JSON).
// TODO: migrate Compatibility page to its own BFF route.
export function useCompatibility() {
  return useQuery<CompatibilityData>({
    queryKey: ['compatibility'],
    queryFn: async () => {
      const data = await import('@/data/compatibility.json')
      return data as unknown as CompatibilityData
    },
    staleTime: Infinity,
  })
}
```

Problems:
- Dynamic `import()` bundled the JSON into the client bundle at build time
- `staleTime: Infinity` prevented any future updates without a full redeploy
- The JSON included a `pairs` section that is now served by the live `/api/astro/compatibility` endpoint — duplicate/stale data

**What changed:**
- Created `GET /api/dashboard/compatibility` — serves `bestMatches` + `todaysMatches`, strips the `pairs` field
- `useCompatibility()` now calls this endpoint via `astroFetchJson()`
- `staleTime` changed to 1h (appropriate for editorial content)
- `pairs` field in the response is set to `{}` to satisfy the existing `CompatibilityData` type without a breaking type change

---

### Gap 3 — `todaysMatches` Is Static, Not Date-Aware ⏳ DEFERRED

**What is happening:**

`/compatibility/today-matches` shows the same pairs every day. The featured pairs (`Scorpio × Cancer: 97%`, `Leo × Sagittarius: 94%`, etc.) are hardcoded in `src/data/compatibility.json`. There is no date-based computation — the same pairs show on March 1 and March 31.

**What should happen:**
- `todaysMatches` could be computed from the current astrological weather:
  - Query which signs have favorable aspects from the provider today
  - Rank pairs based on today's planetary positions
  - Update at midnight UTC

**Impact:** Not user-visible as a bug (users expect these to be a curated editorial list, not a calculated output). Acceptable for MVP. The data is at least served from the server now (not baked into the bundle).

**Phase 2 approach:**
- Add date parameter to `GET /api/dashboard/compatibility?date=2026-03-21`
- Compute today's matches from the Today BFF's transit/aspect data
- Cache with a 24h TTL

---

## Secondary Issues (Non-Blocking)

### `bestMatches` Is Not Personalized to the User's Sun Sign

`BestMatchesPageClient` shows best matches for any sign the user selects (full 12-sign grid). It does not pre-select or highlight the user's own sun sign. This is a UX improvement, not a data gap.

**Phase 2:** Pre-select `selectedSign` from `useUserProfile().sunSign` on mount.

### `pairs` Field in Static JSON Is Now Dead Code

`src/data/compatibility.json` contains a `pairs` field with a subset of Scorpio's compatibility scores. This is now superseded by the live `GET /api/astro/compatibility` endpoint. The `GET /api/dashboard/compatibility` BFF already strips this field before returning. The JSON file can be pruned.

### `useZodiacSigns()` Still Reads Static JSON

```typescript
export function useZodiacSigns() {
  return useQuery({
    queryKey: ['zodiac-signs'],
    queryFn: async () => {
      const data = await import('@/data/zodiac-signs.json')
      return data.signs
    },
    staleTime: Infinity,
  })
}
```

Zodiac signs are genuinely static (they don't change). `staleTime: Infinity` and a static JSON import is correct here. No action needed.

### `sign2` Has No Profile-Based Default

`sign2` (the "Their Sign" slot) starts as `null` and only populates when the user picks a sign. This is correct behavior — we can't know who the user wants to check compatibility with.

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| Per-pair live report (`useCompatibilityPair`) | ✅ Live — provider call with 30-day Supabase cache |
| Entitlement gate (`compatibility.deep`) | ✅ Correct — server-side + UI `FeatureGate` |
| Score ring, category bars, strengths/challenges | ✅ Live — from provider via service layer |
| **sign1 defaults to user's sun sign** | ✅ Fixed — `useUserProfile()` + `defaultSign1` |
| **`useCompatibility()` BFF** | ✅ Fixed — `GET /api/dashboard/compatibility` |
| Best Matches page | ✅ Working — static editorial content via BFF |
| Today's Matches page | ✅ Working — static editorial content via BFF |
| `TodaysMatchesSection` in main page | ✅ Working — 4 categories with pairs |
| Zodiac grid sign selector (bottom sheet) | ✅ Working |
| Soulmate card CTA | ✅ Working — routes to `/settings/reports/soulmate-sketch` |

---

## Complete Change Plan

### What was FIXED (2026-03-21)

| Gap | Change Made |
|---|---|
| `sign1` hardcoded to `'Scorpio'` | `CompatibilityClient` now reads `profile.sunSign` via `useUserProfile()`; `effectiveSign1 = sign1 ?? defaultSign1` |
| `useCompatibility()` static JSON import | Created `GET /api/dashboard/compatibility`; hook calls `astroFetchJson('/api/dashboard/compatibility')` |
| `staleTime: Infinity` on editorial content | Changed to 1h |

### What is DEFERRED

| Gap | Requirement |
|---|---|
| `todaysMatches` date-aware computation | Date-based pairs from Today BFF or provider transits |

### What to ADD (future)

| Feature | Description |
|---|---|
| Dynamic `todaysMatches` | Compute from today's aspects — add `?date=` to BFF |
| Pre-select user's sign in Best Matches | `selectedSign` initialized from `profile.sunSign` |
| Prune `pairs` from `compatibility.json` | Dead code since live endpoint exists |

---

## Layman Summary

**What was broken:**

1. **Wrong sign shown** — every user opened the Compatibility tab with "Scorpio" selected as their sign, even if they were born a Taurus or an Aquarius. The "Your Sign" selector should start with the user's actual sun sign.

2. **Static data baked into the app** — the best-matches lookup and today's featured pairs were hardcoded into the app bundle. Any update required a full redeploy.

**What's fixed:**
- The sign selector now starts with the user's own sun sign (based on their birth date in profile)
- The editorial content (best matches, today's matches) is now served from an API endpoint instead of being baked into the bundle

**What's still static:**
- The "Today's Matches" section shows the same pairs every day. This is editorial content that doesn't update daily. Making it dynamic would require computing pair rankings from today's planetary positions — that's a Phase 2 feature.

---

*This document should be updated when todaysMatches is computed dynamically (Phase 2).*
