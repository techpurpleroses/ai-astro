# Today Tab — Data Architecture

> Covers every UI element visible on the Today tab, exactly what data feeds it, where that data comes from, and whether it is personalized or generic.
>
> **Last updated: 2026-03-21** — reflects BFF migration (Phases 1–3 complete)

---

## Page Layout Overview

```
Today Tab
│
├── [HEADER]             sticky — profile sign labels (Sun | Moon | Rising)
├── [SECTION TABS]       Horoscope | Astro Events | Moon
├── [HERO CARD SLIDER]   one large card per tab, always rendered
├── [ASK ADVISOR CARD]   static CTA
│
├── [HOROSCOPE TAB]
│   ├── Green card strip (Today's Luck, Dating Tips, Biorhythms, Daily Tips, Do/Dont, Daily Matches)
│   ├── Your Horoscope Card (hero)
│   ├── Reports from Advisors
│   ├── Daily Readings Grid (Tarot + Magic Ball)
│   ├── Trendings Card
│   └── Alternative Horoscopes strip
│
├── [ASTRO EVENTS TAB]
│   ├── Cyan card strip (Short Transit, Long Transit, Retrogrades, What Are Transits?)
│   ├── Event of the Day (hero)
│   ├── Upcoming Retrogrades rail
│   └── Upcoming Transits rail
│
└── [MOON TAB]
    ├── Gold card strip (Phase, Moon in Sign, Rituals, Do/Dont)
    ├── Moon Hero Card
    └── Upcoming Moon Events rail
```

---

## Data Request Architecture

All Today tab data now flows through a **single BFF endpoint**. One HTTP request powers the entire tab.

```
Browser
  └── useToday()  →  GET /api/dashboard/today  (1 request, shared across all hooks)
        │
        ├── sections.horoscope  →  useHoroscope(), useAlternativeHoroscope(), useDailyReadings()
        ├── sections.today      →  useTransits(), useRetrogrades(), useMoonPhase()
        └── sections.compatibility  →  useTodayCompatibility()

Separate requests (not from BFF):
  ├── useUserProfile()   →  GET /api/dashboard/profile
  ├── useBirthChart()    →  GET /api/dashboard/birth-chart
  └── useDailyReadings() →  magic-ball + tarot feature endpoints (parallel)
```

TanStack Query deduplicates the `['today']` key — no matter how many hooks call `useToday()`, only one HTTP request is made per stale window.

---

## Hooks Used on This Tab

| Hook | Endpoint / Source | Cache Key | Personalized? |
|---|---|---|---|
| `useToday()` | `GET /api/dashboard/today` | `['today']` | Yes — all sections personalized to subject |
| `useHoroscope()` | Selector over `useToday()` → `sections.horoscope.data.main` | `['today']` | Yes — by sun sign + subject timezone |
| `useAlternativeHoroscope()` | Selector over `useToday()` → `sections.horoscope.data.categories` | `['today']` | Yes — by sun sign |
| `useDailyReadings()` | Parallel: magic-ball + tarot feature endpoints + `useToday()` dos/donts | `['daily-readings', dataUpdatedAt]` | Partially — tarot/magic ball generic; dos/donts from sign |
| `useTransits()` | Selector over `useToday()` → `sections.today.data.transits + events` | `['today']` | Generic (same for all users) |
| `useRetrogrades()` | Selector over `useToday()` → retrograde events | `['today']` | Generic |
| `useMoonPhase()` | Selector over `useToday()` → `sections.today.data.moon` | `['today']` | Generic |
| `useTodayCompatibility()` | Selector over `useToday()` → `sections.compatibility` | `['today']` | Yes — bestMatches filtered by user's sun sign |
| `useUserProfile()` | `GET /api/dashboard/profile` | `['user-profile']` | Yes — per user |
| `useBirthChart()` | `GET /api/dashboard/birth-chart` | `['birth-chart']` | Yes — per user |

> **No `src/data/*.json` files are imported at runtime.** All static JSON files are seed fixtures only. The BFF returns stale artifacts from Supabase when the provider is unavailable.

---

## Section 1: Page Header

**File:** `src/components/today/today-page.tsx`

| UI Element | Data Field | Source |
|---|---|---|
| Sun sign label | `profile.sunSign` → `ZODIAC_NAMES` | `useUserProfile()` |
| Moon sign label | `chart.bigThree.moon.sign` → `ZODIAC_NAMES` | `useBirthChart()` |
| Rising sign label | `chart.bigThree.ascendant.sign` → `ZODIAC_NAMES` | `useBirthChart()` |
| Settings button | Navigation only | — |
| PRO gem button | Navigation only | — |

> Sign labels are hidden for placeholder users (no birth data). Each label has a corresponding icon: `Sun`, `Moon`, `CircleDot` from lucide-react.

---

## Section 2: Tab Hero Slider

**File:** `src/components/today/shared/tab-hero-slider.tsx`

All three hero cards are **always rendered** (CSS sliding, not conditional). Each card shows in the hero position when its tab is active.

### Hero Card: Horoscope (`HoroscopeHero`)

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Sign name label | `ZODIAC_NAMES[DEFAULT_SIGN]` | Constant | No — uses default sign |
| "Your Horoscope" title | Static | — | — |
| Focus list (green) | `reading.opportunities[]` → fallback `['Dedication','Discipline','Ambition']` | `useHoroscope()` | Yes |
| Troubles list (red) | `reading.challenges[]` → fallback `['Stress','Communication','Imbalance']` | `useHoroscope()` | Yes |
| "Transits influencing: N" badge | `shortTerm.length + longTerm.length` — only shown when > 0 | `useTransits()` | No (generic count) |

---

### Hero Card: Astro Events (`EventsHero`)

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| "Event of the day" label | Static | — | — |
| Planet A name + glyph | `transits.shortTerm[0].transitingPlanet` → fallback "Moon" | `useTransits()` | No (generic) |
| Aspect symbol (☌△□ etc.) | `transits.shortTerm[0].aspect` | `useTransits()` | No (generic) |
| Planet B name + glyph | `transits.shortTerm[0].natalPlanet` → fallback "Saturn" | `useTransits()` | No (generic) |
| Positive/Negative label | Computed: `trine` or `sextile` = positive, else negative | `useTransits()` | No |

---

### Hero Card: Moon (`MoonHero`)

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Date range (e.g. "Mar 4 - Mar 11") | `phase.startDate` + `phase.endDate` | `useMoonPhase()` | No (same for all) |
| Phase name (e.g. "Waning Gibbous") | `phase.name` | `useMoonPhase()` | No |
| Phase image | Mapped from `phase.name` → local asset | `useMoonPhase()` | No |
| "Moon in Libra" sign label | `phase.sign` | `useMoonPhase()` | No |
| Zodiac glyph / sign image | `phase.sign` → local asset | `useMoonPhase()` | No |
| Timeline dots (4 upcoming phases) | `upcomingEvents[0..3].date + .type` | `useMoonPhase()` | No |

---

## Section 3: HOROSCOPE Tab

### 3A — Green Card Strip (Top Insights)

**File:** `src/components/today/horoscope/top-insights-strip.tsx`
**Viewer:** Opens `TodayStoryViewer` (portal overlay)

Each card when tapped opens a full-screen story viewer. The sections inside are built from hook data.

#### Card 1 — Today's Luck

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Heading | `horoscope.title` | `useHoroscope()` |
| Body | `horoscope.text` | `useHoroscope()` |
| Bullets | `horoscope.opportunities[]` (max 4) | `useHoroscope()` |
| Section 2 heading | `"Energy Level: {horoscope.energy}%"` | `useHoroscope()` |
| Section 2 body | `horoscope.emotionalTone` | `useHoroscope()` |
| Section 2 bullets | `horoscope.challenges[]` (max 3) | `useHoroscope()` |

**Personalized:** Yes — different per sun sign and subject-local date

---

#### Card 2 — Dating Tips

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Heading | "Love & Attraction" (static) | — |
| Body | `altHoroscope.love.text` | `useAlternativeHoroscope()` |
| Bullets | `altHoroscope.love.keywords[]` (max 4) | `useAlternativeHoroscope()` |
| Section 2 heading | "Your Day Overall" | — |
| Section 2 body | `altHoroscope['your-day'].text` | `useAlternativeHoroscope()` |
| Section 2 bullets | `altHoroscope['your-day'].keywords[]` (max 3) | `useAlternativeHoroscope()` |

**Personalized:** Yes — different per sun sign

---

#### Card 3 — Biorhythms

> Uses **real sinusoidal biorhythm cycles** computed from the user's birth date.
> Falls back to energy-offset estimates when birth date is unavailable (placeholder users).

| Section in Viewer | Computation | Source |
|---|---|---|
| Physical Cycle % | `Math.sin(2π × daysSinceBirth / 23)` scaled 0–100 | `useUserProfile()` → `birthDate` + `useToday()` → `localDate` |
| Emotional Cycle % | `Math.sin(2π × daysSinceBirth / 28)` scaled 0–100 | Same |
| Intellectual Cycle % | `Math.sin(2π × daysSinceBirth / 33)` scaled 0–100 | Same |
| Intellectual bullets | `altHoroscope.career.keywords[]` | `useAlternativeHoroscope()` |
| Interpretation text | Computed from % thresholds (>75 / >50 / else) | Inline logic |

**Fallback (no birth date):** `physical = clamp(energy + 5, 20, 100)` etc. — energy-offset estimates.

**Personalized:** Yes — unique to each user's birth date and today's subject-local date

---

#### Card 4 — Daily Tips

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Bullet list | `daily.dos[]` (max 5) | `useDailyReadings()` |
| Career body | `altHoroscope.career.text` | `useAlternativeHoroscope()` |
| Career bullets | `altHoroscope.career.keywords[]` | `useAlternativeHoroscope()` |

**Personalized:** Yes — dos from live horoscope, career from sign-based categories

---

#### Card 5 — Do / Don't

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Do list | `daily.dos[]` (max 4) | `useDailyReadings()` |
| Don't list | `daily.donts[]` (max 4) | `useDailyReadings()` |

**Personalized:** Yes — sourced from live horoscope challenges/opportunities

---

#### Card 6 — Daily Matches

| Section in Viewer | Data Field | Hook |
|---|---|---|
| "Your Best Cosmic Matches" | `compat.bestMatches[]` (top 4 for user's sign) | `useTodayCompatibility()` |
| Context body | Formatted from user's sign name | `useUserProfile()` |
| "Today's Love Match" | `compat.todaysMatches.love[0]` — `.note`, `.sign1`, `.sign2`, `.score` | `useTodayCompatibility()` |
| Additional pairs | `compat.todaysMatches.love[1..2]` | `useTodayCompatibility()` |

**Data shape (BFF compatibility section):**
```typescript
sections.compatibility: {
  bestMatches: string[]           // top 4 signs for user's sun sign
  todaysMatches: {
    love: ZodiacMatch[]           // { sign1, sign2, score, note }[]
  }
  status: 'ok' | 'stale' | 'error' | 'skipped'
}
```

**Personalized:** Yes — best matches are filtered to user's sun sign from `astro_core.compatibility_facts`

---

#### Story Viewer — Feedback

**File:** `src/components/today/shared/today-story-viewer.tsx`

Every `SectionCard` has thumbs-up / thumbs-down buttons. When toggled ON, a fire-and-forget POST is sent:

```
POST /api/dashboard/analytics
{ type: 'story_feedback', properties: { storyId, sectionHeading, sentiment: 'up' | 'down' } }
```

Toggling the same button off (deselect) does not re-fire. The call is void — UI never blocks or shows errors from this.

---

### 3B — Your Horoscope Card (Hero)

**File:** `src/components/today/horoscope/your-horoscope-card.tsx`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Sign name label | `profile.sunSign` | `useUserProfile()` | Yes |
| Focus list (green) | `reading.opportunities[]` (max 3) | `useHoroscope()` | Yes |
| Troubles list (red) | `reading.challenges[]` (max 3) | `useHoroscope()` | Yes |
| "Read more" sheet — full text | `reading.text` | `useHoroscope()` | Yes |
| "Read more" sheet — all opportunities | `reading.opportunities[]` | `useHoroscope()` | Yes |
| "Read more" sheet — all challenges | `reading.challenges[]` | `useHoroscope()` | Yes |
| "Transits influencing: N" badge | `shortTerm.length + longTerm.length` — only shown when > 0 | `useTransits()` | No |

---

### 3C — Reports from Advisors

**File:** `src/components/reports/reports-from-advisors.tsx` (compact mode)

Pulls report products list. Not detailed here — see Reports data architecture.

---

### 3D — Daily Readings Grid

**File:** `src/components/today/horoscope/daily-readings-grid.tsx`

Data comes from **`useDailyReadings()`** which fetches in parallel:

```
useDailyReadings()
  ├── GET /api/dashboard/features/magic-ball   → answers[], suggestedQuestions[]
  ├── GET /api/dashboard/features/tarot        → cards[] (78 cards)
  │     └── picks card: cards[hash(today) % 78]   ← same for ALL users today
  └── useToday() → sections.horoscope.data.main   → dos[], donts[]
        └── via todayQuery.dataUpdatedAt in query key for reactivity
```

#### Tarot Card widget

| UI Element | Data Field | Personalized? |
|---|---|---|
| "Your Card Awaits" preview | Static | No |
| Card name (in sheet) | `readings.tarot.name` | No — hash of date |
| Card image | `readings.tarot.imageSlug` → Supabase Storage `.jpg` | No |
| Arcana / suit badge | `readings.tarot.arcana`, `.suit`, `.number` | No |
| Tip of the Day | `readings.tarot.tipOfDay` | No |
| Upright Meaning | `readings.tarot.uprightMeaning` | No |

#### Magic Ball widget

| UI Element | Data Field | Personalized? |
|---|---|---|
| Ball animation | Static UI | No |
| Answer text | `readings.magicBall.answers[]` — random pick | No |
| Suggested question | `readings.magicBall.suggestedQuestions[]` | No |

---

### 3E — Trendings Card

**File:** `src/components/today/horoscope/trendings-card.tsx`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Trending question text | `readings.trendingQuestion` = `magicBall.suggestedQuestions[0]` | `useDailyReadings()` | No |

---

### 3F — Alternative Horoscope Strip

**File:** `src/components/today/horoscope/alternative-horoscope.tsx`

**100% static.** No hook calls. Renders 5 hardcoded items:

| Label | Image |
|---|---|
| Indian lunar | `/assets/today/horoscope/indian-lunar.webp` |
| Indian solar | `/assets/today/horoscope/indian-solar.webp` |
| Mayan | `/assets/today/horoscope/mayan.webp` |
| Chinese | `/assets/today/horoscope/chinese.webp` |
| Druid | `/assets/today/horoscope/druid.webp` |

> These are navigation buttons — they do not currently link to live data. Connecting to `astro_artifacts.story_categories` is Phase 4 work.

---

## Section 4: ASTRO EVENTS Tab

### 4A — Cyan Card Strip (Top Events)

**File:** `src/components/today/astro-events/astro-card-strip.tsx`
**Viewer:** Opens `TodayStoryViewer`

#### Card 1 — Short-Term Transit

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Heading | `transit.title` | `useTransits()` → `shortTerm[0..2]` |
| Body | `transit.interpretation` | `useTransits()` |

**Personalized:** No — same transits for all users on a given day

---

#### Card 2 — Long-Term Transit

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Heading | `transit.title` | `useTransits()` → `longTerm[0..2]` |
| Body | `transit.interpretation` | `useTransits()` |
| Static advice section | Hardcoded tips | Static |

**Personalized:** No

---

#### Card 3 — Active Retrogrades

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Heading | `"{planet} Retrograde in {sign}"` | `useRetrogrades()` → `active[]` |
| Body | `retrograde.interpretation` | `useRetrogrades()` |
| Static navigation tips | Hardcoded bullets | Static |

**Personalized:** No

---

#### Card 4 — What Are Transits?

100% static educational content. No hook calls.

---

### 4B — Event of the Day (Hero)

**File:** `src/components/today/astro-events/astro-events-section.tsx` → `EventOfDayCard`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Planet A name + orb image | `transits.shortTerm[0].transitingPlanet` | `useTransits()` | No |
| Aspect symbol | `transits.shortTerm[0].aspect` | `useTransits()` | No |
| Planet B name + orb image | `transits.shortTerm[0].natalPlanet` | `useTransits()` | No |
| Positive/Negative label | Derived from `aspect` type | `useTransits()` | No |

---

### 4C — Upcoming Retrogrades Rail

**File:** `astro-events-section.tsx` → `RetrogradeCard`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Planet name | `retrograde.planet` | `useRetrogrades()` → `active + upcoming` | No |
| Date label | `retrograde.startDate` | `useRetrogrades()` | No |
| Planet orb image | Mapped from `retrograde.planet` | Static map | No |

Max 6 retrogrades shown. Deduplicated by planet name.

---

### 4D — Upcoming Transits Rail

**File:** `astro-events-section.tsx` → `TransitDeckCard`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Planet A orb | `transit.transitingPlanet` | `useTransits()` → `shortTerm + longTerm` | No |
| Aspect symbol | `transit.aspect` | `useTransits()` | No |
| Planet B orb | `transit.natalPlanet` | `useTransits()` | No |
| Positive/Neutral/Negative label | Derived from `aspect` | `useTransits()` | No |
| Date label | `transit.startDate` | `useTransits()` | No |

Max 6 transits shown (shortTerm + longTerm combined).

---

## Section 5: MOON Tab

### 5A — Gold Card Strip (Moon Cards)

**File:** `src/components/today/moon/moon-card-strip.tsx`
**Viewer:** Opens `TodayStoryViewer`

#### Card 1 — Current Phase (dynamic label e.g. "Waning Gibbous")

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Heading | `"{phase.name} — {illumination}% Illuminated"` | `useMoonPhase()` |
| Body | Computed from `phase.isWaxing` | `useMoonPhase()` |
| Next phase preview | `upcomingEvents[0].type + .sign + days away` | `useMoonPhase()` |

---

#### Card 2 — Moon in Sign (dynamic label e.g. "Moon in Libra")

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Sign name in heading | `phase.sign` | `useMoonPhase()` |
| Body | Hardcoded per-sign description (12 entries) | Inline map |
| Effect description | Hardcoded per-sign effect text | Inline map |
| Tip bullets | Hardcoded per-sign tips | Inline map |

**Personalized:** No — same for all users (moon is in same sign for everyone)

---

#### Card 3 — Moon Rituals

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Ritual bullets | `MOON_PHASE_RITUALS[phase.name]` — 4–5 items | `useMoonPhase()` + inline map |
| "Moon Journaling" section | Static | — |

**Personalized:** No — phase-specific but same for all users

---

#### Card 4 — Do / Don't (Moon)

| Section in Viewer | Data Field | Hook |
|---|---|---|
| Do list | `MOON_PHASE_DO_DONTS[phase.name].dos` | `useMoonPhase()` + inline map |
| Don't list | `MOON_PHASE_DO_DONTS[phase.name].donts` | `useMoonPhase()` + inline map |
| Timing context | Uses `phase.name` | `useMoonPhase()` |

**Personalized:** No

---

### 5B — Moon Hero Card

**File:** `src/components/today/moon/moon-section.tsx` → `MoonHeroCard`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Date range | `phase.startDate` + `phase.endDate` | `useMoonPhase()` | No |
| Phase name heading | `phase.name` | `useMoonPhase()` | No |
| Phase image (circle) | Mapped from `phase.name` → local asset | `useMoonPhase()` | No |
| "Moon in {Sign}" label | `phase.sign` | `useMoonPhase()` | No |
| Zodiac glyph | `ZODIAC_GLYPHS[phase.sign]` | `useMoonPhase()` | No |
| Sign image | Mapped from `phase.sign` → local asset (4 signs have images) | `useMoonPhase()` | No |
| 4-dot timeline | `upcomingEvents[0..3].date + .type` | `useMoonPhase()` | No |

---

### 5C — Upcoming Moon Events Rail

**File:** `moon-section.tsx` → `MoonEventCard`

| UI Element | Data Field | Hook | Personalized? |
|---|---|---|---|
| Date label | `event.date` | `useMoonPhase()` → `upcomingEvents[]` | No |
| Title (first 2: "Moon in Sign", rest: phase name) | `event.sign` or `event.type` | `useMoonPhase()` | No |
| Image | Sign image or phase image | `useMoonPhase()` | No |

---

## Data Flow Summary

```
User Profile (sign + birth date)
  └── useUserProfile() → GET /api/dashboard/profile
        └── DB: identity.subjects

Birth Chart (Big Three)
  └── useBirthChart() → GET /api/dashboard/birth-chart
        └── DB: astro_artifacts.birth_chart_artifacts

           Both used by: today-page.tsx header signs,
                         Biorhythms card (birthDate for real cycle math)


Today BFF (single request for all tab data)
  └── useToday() → GET /api/dashboard/today
        ├── reads identity.subjects → personalization_timezone
        ├── derives subject's local date server-side (Intl.DateTimeFormat en-CA)
        ├── reads astro_artifacts.daily_horoscope_artifacts (Supabase-first)
        ├── reads astro_core.transit_facts_daily + retrograde_periods
        ├── reads astro_core.moon_facts_daily + moon_events
        ├── reads astro_core.compatibility_facts (filtered by user sign)
        └── runs all sections via Promise.allSettled() for partial failure safety

           Selector hooks (all share ['today'] cache key):
             useHoroscope()             → sections.horoscope.data.main
             useAlternativeHoroscope()  → sections.horoscope.data.categories
             useTransits()              → sections.today.data.transits + events
             useRetrogrades()           → sections.today.data.events (retrograde type)
             useMoonPhase()             → sections.today.data.moon
             useTodayCompatibility()    → sections.compatibility


Daily Readings (parallel, separate from BFF)
  └── useDailyReadings()
        ├── GET /api/dashboard/features/magic-ball  → static answers
        ├── GET /api/dashboard/features/tarot       → 78 cards, date-hash pick
        └── useToday() data → dos[], donts[] (no extra API call)

           Used by: TarotCard widget, MagicBall widget, TrendingsCard,
                    Daily Tips card, Do/Dont card


User Feedback (fire-and-forget, fail-silent)
  └── POST /api/dashboard/analytics
        └── writes to platform.analytics_events

           Fired by: TodayStoryViewer SectionCard thumbs-up/down
```

---

## Personalized vs Generic — Quick Reference

| UI Component | Personalized? | Requires |
|---|---|---|
| Header sign labels | Yes — dynamic | Sun sign (profile), Moon + Rising (birth chart) |
| Hero slider — Horoscope hero | Yes | Sun sign |
| Hero slider — Events hero | No | — |
| Hero slider — Moon hero | No | — |
| Green card strip (all 6 cards) | Yes (mostly) | Sun sign + birth date |
| Biorhythms cycles | Yes — real math | Birth date |
| Daily Matches | Yes | Sun sign → compatibility_facts |
| Your Horoscope Card | Yes | Sun sign |
| Tarot card of the day | No | — (date hash, same for all) |
| Magic ball | No | — (random from static list) |
| Trendings question | No | — |
| Alternative Horoscopes strip | No | — (static navigation, Phase 4) |
| Cyan card strip (4 cards) | No | — |
| Event of the Day | No | — |
| Retrogrades rail | No | — |
| Transits rail | No | — |
| Gold card strip (4 cards) | No | — |
| Moon Hero Card | No | — |
| Upcoming Moon Events rail | No | — |
| Story viewer feedback | N/A | Persists to platform.analytics_events |

---

## Fallback Strategy

The BFF endpoint handles all fallback logic. Frontend hooks do not choose their own data source.

| Scenario | Behavior |
|---|---|
| Supabase artifact fresh | Return cached artifact immediately; `source: 'cache'` |
| Supabase artifact stale or missing | Call provider → write artifact to Supabase → return; `source: 'refreshed'` |
| Provider unavailable | Return stale Supabase artifact; `source: 'stale_fallback'` |
| Section fetch fails | That section returns `status: 'error'`; other sections unaffected (Promise.allSettled) |
| `compatibility_facts` table empty | Compatibility section returns `status: 'skipped'` with empty arrays |

> **`src/data/*.json` files are never imported at runtime.** They exist only as seed fixtures for seeding Supabase tables.

---

## API Endpoints

### `GET /api/dashboard/today` — BFF screen route

**File:** `src/app/api/dashboard/today/route.ts`

**Response shape (`TodayScreenDTO`):**
```typescript
{
  subject: {
    sunSign: string | null
    localDate: string          // YYYY-MM-DD in subject's timezone
    timezone: string           // IANA timezone
  }
  sections: {
    today: {
      status: 'ok' | 'stale' | 'error' | 'skipped'
      data: { moon: MoonData; transits: Transit[]; events: AstroEvent[] }
    }
    horoscope: {
      status: 'ok' | 'stale' | 'error' | 'skipped'
      data: { main: HoroscopeReading; categories: AlternativeHoroscope }
    }
    compatibility: {
      status: 'ok' | 'stale' | 'error' | 'skipped'
      bestMatches: string[]
      todaysMatches: { love: ZodiacMatch[] }
    }
  }
  meta: {
    contractVersion: string
    traceId: string
    generatedAt: string
  }
}
```

---

### `POST /api/dashboard/analytics` — feedback endpoint

**File:** `src/app/api/dashboard/analytics/route.ts`

**Request body:**
```json
{ "type": "story_feedback", "properties": { "storyId": "biorhythms", "sectionHeading": "Physical Cycle — 72%", "sentiment": "up" } }
```

**Response:** Always `{ ok: true }` — fail-silent by design. Writes to `platform.analytics_events`.

---

### `GET /api/dashboard/profile` — user profile

**Request:** `GET /api/dashboard/profile`

**Response shape:**
```typescript
{
  userId: string
  isPlaceholder: boolean
  sunSign: string | null       // e.g. 'scorpio'
  timezone: string             // e.g. 'America/New_York'
  birthDate: string | null     // YYYY-MM-DD
}
```

---

*This document should be updated after each phase of migration is complete.*
