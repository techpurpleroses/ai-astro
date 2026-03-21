# Today Tab — Gap Analysis vs Production Plan

> Compares the Today tab implementation against `docs/backend-plan/PLAN.md`.
> Every item below is a concrete, traceable finding based on reading the actual hook code, component code, and the authoritative plan.
>
> **Original analysis: 2026-03-21**
> **Implementation complete: 2026-03-21 — Phases 1–3 done**

---

## Summary Verdict

**Phases 1–3 are complete. The Today tab is now BFF-driven with real personalization.**

The six critical production-blocking problems identified in the original analysis have been resolved:

| # | Problem | Status |
|---|---|---|
| 1 | `src/data/*` imported at runtime | ✅ Removed from all hooks |
| 2 | Hooks called low-level routes instead of BFF | ✅ All hooks are selectors over `useToday()` |
| 3 | Browser date instead of subject timezone | ✅ BFF derives subject-local date server-side |
| 4 | Supabase caching completely absent | ✅ BFF reads Supabase-first via TodayService/HoroscopeService |
| 5 | Compatibility served from static JSON forever | ✅ `useTodayCompatibility()` reads from `astro_core.compatibility_facts` via BFF |
| 6 | Missing production wiring (feedback, partial failure, provenance) | ✅ Partial — feedback wired; partial failure via Promise.allSettled; provenance meta added |

Remaining work is Phase 4 (Alternative Horoscopes strip) and Phase 5 (budget guards, observability) — neither is blocking for MVP.

---

## Original Rule-by-Rule Breakdown

### Rule 1 — `src/data/*` must not be imported at runtime after migration ✅ RESOLVED

**What was happening:**
Every hook imported static JSON at runtime as a fallback (`import('@/data/horoscope.json')` etc.).
`useCompatibility()` had `staleTime: Infinity` and never called any API — static JSON forever.

**What changed:**
- All `import('@/data/*.json')` calls removed from every hook's `queryFn`
- `useHoroscope`, `useAlternativeHoroscope`, `useTransits`, `useRetrogrades`, `useMoonPhase` are now selectors over `useToday()` — they receive data from the BFF, not from local files
- `src/data/*.json` files remain in the repo as seed fixtures only
- Fallback logic is now the BFF's responsibility: it returns a `stale_fallback` artifact from Supabase when the provider is unavailable

---

### Rule 2 — Hooks must call the BFF screen route, not low-level routes ✅ RESOLVED

**What was happening:**
- `useHoroscope` / `useAlternativeHoroscope` → `GET /api/dashboard/horoscope?sign=&date=`
- `useTransits` / `useRetrogrades` / `useMoonPhase` → `GET /api/astro/today?date=` (low-level)
- `useCompatibility` → no API call at all
- No `GET /api/dashboard/today` call existed anywhere

**What changed:**
- `GET /api/dashboard/today` BFF route built: `src/app/api/dashboard/today/route.ts`
- `useToday()` hook created: `src/hooks/use-today.ts` — calls the BFF once with `['today']` cache key
- All Today tab domain hooks refactored to be selectors over `useToday()`:
  - `useHoroscope()` → `sections.horoscope.data.main`
  - `useAlternativeHoroscope()` → `sections.horoscope.data.categories`
  - `useTransits()` → `sections.today.data.transits + events`
  - `useRetrogrades()` → retrograde events from `sections.today.data.events`
  - `useMoonPhase()` → `sections.today.data.moon`
  - `useTodayCompatibility()` → `sections.compatibility` (new hook)
- `GET /api/astro/today` remains available as a backend-internal route but is no longer called from the browser

---

### Rule 3 — Daily personalization must use subject's timezone, not browser date ✅ RESOLVED

**What was happening:**
Every hook used `new Date().toISOString().slice(0, 10)` (browser UTC) — users in IST (+5:30) received yesterday's horoscope until 5:30 AM.

**What changed:**
- BFF reads `identity.subjects.personalization_timezone` from Supabase
- Server derives the subject's local date: `Intl.DateTimeFormat('en-CA', { timeZone: subject.personalization_timezone }).format(new Date())`
- `localDate` is included in `TodayScreenDTO.subject.localDate`
- `useToday()` exposes `data.subject.localDate` — hooks and components read from this, not `new Date()`
- No hook passes a `date` parameter — the BFF owns all date logic

---

### Rule 4 — Supabase artifact caching is completely absent ✅ RESOLVED (via existing services)

**What was happening:**
Every page load hit the provider directly. No Supabase read anywhere in the Today tab hot path.

**What changed:**
- BFF route delegates to `todayService.getToday()` and `horoscopeService.getHoroscope()` — both already implement the Supabase-first pattern (read `astro_core.*` / `astro_artifacts.*` first, call provider only on miss/stale)
- Per-section `Promise.allSettled()` ensures one failed section doesn't collapse the whole screen
- Each section carries `status: 'ok' | 'stale' | 'error' | 'skipped'` provenance
- Response includes `meta.contractVersion`, `meta.traceId`, `meta.generatedAt`

> **Note:** Full budget guard integration (Rule 6B) is Phase 5 work and not yet wired.

---

### Rule 5 — Compatibility must come from Supabase, not static JSON ✅ RESOLVED

**What was happening:**
`useCompatibility()` had `staleTime: Infinity`, always read `src/data/compatibility.json`, never called any API.

**What changed:**
- BFF compatibility section reads `astro_core.compatibility_facts` directly:
  - `bestMatches` = top 4 signs by `overall` score where `sign_a = userSign`
  - `todaysMatches.love` = top 3 pairs by `love` score across all pairs
- `useTodayCompatibility()` created in `src/hooks/use-compatibility.ts` — selector over `useToday()`
- `top-insights-strip.tsx` (Daily Matches card) now uses `useTodayCompatibility()` instead of `useCompatibility()` + static JSON
- `useCompatibility()` kept as-is for the Compatibility page (static JSON, separate migration scope)

---

### Rule 6 — Missing production wiring ⚠️ PARTIALLY RESOLVED

#### 6A — Provenance metadata ✅ Added
BFF response now includes `meta.contractVersion`, `meta.traceId`, `meta.generatedAt`. Each section carries `status: 'ok' | 'stale' | 'error' | 'skipped'`.

> `expires_at` and `subject_version` fields are not yet included — these are Phase 5 items.

#### 6B — Budget guard integration ⏳ Phase 5 (pending)
Not yet wired. Every BFF request goes to provider unless Supabase artifact is fresh. Budget threshold checks (60% / 80% / 95% degradation tiers) need to be added to the BFF route middleware.

#### 6C — Partial failure handling ✅ Resolved
BFF uses `Promise.allSettled()` for all section fetches. A failed section returns `status: 'error'` with empty/null data; other sections are unaffected. One broken section no longer collapses the entire tab.

#### 6D — Subject version on cache keys ⏳ Phase 5 (pending)
TanStack Query cache key is `['today']`. When a user updates their birth date, `useUpdateProfile` now invalidates `['today']` (fixed from old per-hook invalidation), which correctly triggers a BFF refetch. Explicit `subject_version` propagation into the cache key is Phase 5 hardening.

#### 6E — Feedback buttons write nothing ✅ Resolved
- `POST /api/dashboard/analytics` route built: `src/app/api/dashboard/analytics/route.ts`
- Authenticates user, writes to `platform.analytics_events`
- Always returns `{ ok: true }` — fail-silent by design
- `TodayStoryViewer` `SectionCard` now fires a POST on thumbs-up / thumbs-down toggle
- Payload: `{ type: 'story_feedback', properties: { storyId, sectionHeading, sentiment } }`

---

## What Is Currently Working

| What | Status |
|---|---|
| All UI components (story viewer, card strips, hero slider, section layout) | ✅ Unchanged — still correct |
| Single BFF request for all Today tab data | ✅ New — `GET /api/dashboard/today` |
| TanStack Query deduplication (`['today']` shared key) | ✅ Working — all selectors share one request |
| Subject-local date from server timezone | ✅ Fixed |
| Real biorhythm cycles (sinusoidal, birth-date-based) | ✅ Fixed |
| Dynamic header signs (Sun, Moon, Rising) | ✅ Fixed — from `useUserProfile()` + `useBirthChart()` |
| Real transit count badge | ✅ Fixed — no longer hardcoded |
| Compatibility from Supabase | ✅ Fixed — `useTodayCompatibility()` from BFF |
| Feedback persisted to analytics | ✅ Fixed — `platform.analytics_events` |
| Partial failure isolation per section | ✅ Fixed — `Promise.allSettled()` |
| Supabase-first caching (via TodayService / HoroscopeService) | ✅ In place via existing services |

---

## Remaining Work (Phases 4–5)

### Phase 4 — Connect Alternative Horoscopes strip

**File:** `src/components/today/horoscope/alternative-horoscope.tsx`

Currently 5 static navigation buttons (Indian lunar, Indian solar, Mayan, Chinese, Druid).

Options:
- Read from `astro_artifacts.story_categories` and link each item to its story reader
- Gate behind "Coming Soon" with a feature flag until content is ready

---

### Phase 5 — Budget guards and observability

| Item | Description |
|---|---|
| Budget threshold middleware | Wire 60% / 80% / 95% degradation tiers into the BFF route |
| `subject_version` in cache key | Propagate from BFF `meta` into TanStack Query key for precise invalidation |
| `expires_at` in BFF response | Return cache expiry so client can schedule proactive refresh |
| Structured logging | Add provider call logging, latency tracking, and alerting to BFF route |
| Retention jobs | Confirm `raw_api_snapshots` retention jobs are running |

---

## Personalization Reality Check (Updated)

| Feature | Before | After |
|---|---|---|
| Header sign labels | Hardcoded (Capricorn/Scorpio/Cancer) | ✅ Dynamic from `profile.sunSign`, `chart.bigThree` |
| Horoscope text | Personalized by sun sign ✓ | ✅ Same — now via BFF |
| Biorhythms | Fake (energy offset) | ✅ Real sinusoidal cycles from birth date |
| Compatibility matches | Static JSON — same for everyone | ✅ `astro_core.compatibility_facts[userSign]` |
| Today's matches | Static JSON | ✅ BFF scoring from compatibility matrix |
| Transits / Moon / Retrogrades | Generic (same for all) ✓ | ✅ Same — global sky events are correctly generic |
| Tarot card of day | Date-hash (same for all) | ✅ Same — acceptable per PLAN.md |
| "Today" date | Browser UTC date | ✅ Subject's `personalization_timezone` local date |
| Transits influencing badge | Hardcoded "4" | ✅ Real count from transit data |
| Story feedback | Lost on refresh | ✅ Persisted to `platform.analytics_events` |
| Supabase artifact caching | Absent — every load hit provider | ✅ BFF reads Supabase-first |
| Partial failure | One failure collapses whole tab | ✅ Per-section isolation via `Promise.allSettled()` |

---

## Layman Summary (Updated)

**Before (original problems):**

1. The app read from local test files instead of a real database
2. Every user saw the same generic data regardless of their sign or birth date
3. Every page load called the external astrology provider — no caching
4. Compatibility was a hardcoded list that never changed
5. User feedback was lost on page refresh

**After (current state):**

1. All Today tab data flows through one smart backend endpoint (`GET /api/dashboard/today`)
2. The server checks its database first and only calls the astrology provider when data is old
3. The server uses the user's actual timezone to determine "what day is today"
4. Compatibility is read from a real database table filtered to the user's sign
5. User feedback (thumbs-up/down) is saved to the analytics database
6. If one section fails, the rest of the page still loads normally

**What still needs to be built:**
- Budget guards (stop calling the provider when usage is too high)
- The Alternative Horoscopes strip (currently dead navigation buttons)
- Structured observability and logging

---

*This document should be updated after each phase of migration is complete.*
