# AstroAI — Data Architecture & Knowledge Base

> **Last updated:** March 2026
> Covers: data sources, data flow, personalization, API schema, database tables, hooks, REST endpoints, and a plain-English summary for non-technical readers.

---

## Table of Contents

1. [What Data Exists and Where It Lives](#1-what-data-exists-and-where-it-lives)
2. [Common (Static) vs Personalized Data](#2-common-static-vs-personalized-data)
3. [Data Sources](#3-data-sources)
4. [API Routes Reference](#4-api-routes-reference)
5. [Frontend Hooks — What Fetches What](#5-frontend-hooks--what-fetches-what)
6. [Supabase Database Schema](#6-supabase-database-schema)
7. [Data Types & Schema Examples](#7-data-types--schema-examples)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Billing & Entitlement System](#9-billing--entitlement-system)
10. [External Services & Environment Variables](#10-external-services--environment-variables)
11. [Layman Summary (Non-Technical)](#11-layman-summary-non-technical)

---

## 1. What Data Exists and Where It Lives

| Data Category | Storage Location | Update Frequency |
|---|---|---|
| User profile (name, birth date, timezone) | Supabase DB (`identity.subjects`) | On user update |
| User auth / session | Supabase Auth | Per session |
| Subscription / plan status | Supabase DB (`billing.subscriptions`) | On Stripe webhook |
| Pricing / plans | Supabase DB (`billing.plan_catalog`) | Rarely |
| Horoscope readings | External Astrology API → memory cache | Daily |
| Birth chart data | External Astrology API → memory cache | On-demand |
| Moon phase | External Astrology API → memory cache | Daily |
| Transits & retrogrades | External Astrology API → memory cache | Daily |
| Compatibility scores | External Astrology API → memory cache | On-demand |
| Tarot card deck (78 cards) | Supabase Storage (`tarot-cards/`) + static JSON | Static |
| Story articles | Static TypeScript data file (`src/data/stories.ts`) | Deploy-time |
| Advisor profiles | Static JSON (`src/data/advisors.json`) | Deploy-time |
| Chat messages | Supabase DB (not fully modelled — in-memory/session for now) | Per message |
| Palm scan results | Supabase DB (via palm history API) | On-demand |
| Magic ball answers | Static JSON (`src/data/daily-readings.json`) | Deploy-time |
| Report products | Static TypeScript (`src/data/reports.ts`) | Deploy-time |

### Static Fallback Files in `src/data/`

These are used when the live API is unavailable. They ensure the app always renders something.

| File | Contains |
|---|---|
| `horoscope.json` | Scorpio example horoscope readings with dates |
| `alternative-horoscope.json` | Love / health / career / your-day readings per sign |
| `birth-chart.json` | Full birth chart example for Scorpio/Pisces/Cancer |
| `compatibility.json` | Pair scores, best matches per sign, today's match lists |
| `moon.json` | Current moon phase + next 4 upcoming phases |
| `transits.json` | Short-term + long-term transits + event of day |
| `retrogrades.json` | Active + upcoming retrograde planets |
| `advisors.json` | 5 advisor profiles with bios, rates, specialties |
| `daily-readings.json` | Magic ball answers + tarot card + daily tips |
| `zodiac-signs.json` | Metadata for all 12 signs |

---

## 2. Common (Static) vs Personalized Data

### Truly Personalized (requires user's birth data)

These fields depend on the user's **birth date + birth time + birth location**:

| Feature | Personalization Parameters | What Changes |
|---|---|---|
| Horoscope | Sun sign (from birth date) | Text, energy level, challenges, opportunities |
| Birth chart | Full birth data (date + time + place) | Planets, houses, aspects, Big Three |
| Compatibility | User's sun sign vs selected sign | Overall %, love %, career %, strengths, challenges |
| Palm reading | Uploaded hand photo | Line detection + AI interpretation |
| Advisor chat | User's sign + chat history | AI context includes sign |
| Daily readings | Sun sign | Love tip, do/don't list |
| Transits | User's natal chart positions | Which planets trigger which houses |

### Semi-Personalized (sign-based only, no time/place needed)

| Feature | Parameter |
|---|---|
| Biorhythms display | Derived from horoscope energy score (no birth time used) |
| Daily matches | User's sun sign → looks up `bestMatches[sign]` |
| Today's luck | Sun sign horoscope text |
| Dating tips | Sun sign love category from alternative horoscope |

### Common / Generic (same for all users)

| Feature | Notes |
|---|---|
| Moon phase name + illumination | Same for everyone on a given date |
| Moon sign | Same for everyone (moon moves every 2.5 days) |
| Active retrogrades | Same for everyone globally |
| Story articles | Same content, not personalized |
| Tarot card of the day | Deterministic hash of today's date — same for all users |
| Magic ball answers | Random pick from static list |
| Report product catalog | Same pricing/descriptions for all |
| What Are Transits? | Educational static content |

---

## 3. Data Sources

```
┌─────────────────────────────────────────────────────┐
│                  DATA SOURCES                        │
├──────────────────────┬──────────────────────────────┤
│  Supabase (our DB)   │  External APIs               │
│  ─────────────────   │  ──────────────              │
│  • User profiles     │  • Astrology Provider API    │
│  • Birth data        │    (horoscope, birth chart,  │
│  • Subscriptions     │     moon, transits,          │
│  • Billing plans     │     compatibility)           │
│  • Credit history    │  • Stripe (payments)         │
│  • Chat sessions     │  • OpenAI GPT-4 (chat AI,    │
│  • Palm scan history │    palm interpretation)      │
│  • Tarot images      │  • Roboflow ML (palm detect) │
│                      │  • Mapbox (location search)  │
│  Static Files        │                              │
│  ─────────────────   │                              │
│  • Story content     │                              │
│  • Advisor profiles  │                              │
│  • Report products   │                              │
│  • Fallback data     │                              │
└──────────────────────┴──────────────────────────────┘
```

### Astrology Provider

Configured via `ASTROLOGY_PROVIDER` env var. Supports multiple backends:

| Provider | Default? | Env Vars |
|---|---|---|
| `astrology-api.io` | Yes | `ASTROLOGY_API_KEY`, `ASTROLOGY_API_BASE_URL` |
| Prokerala | Optional | `PROKERALA_CLIENT_ID`, `PROKERALA_CLIENT_SECRET` |
| AstrologyAPI | Optional | `ASTROLOGYAPI_USER_ID`, `ASTROLOGYAPI_API_KEY` |

Supports astrology systems: `western` (default), `vedic`, `chinese`, `indian_lunar`, `indian_solar`, `mayan`, `druid`

---

## 4. API Routes Reference

### Authentication — `/api/auth/`

| Route | Method | Auth Required | Request Body | Returns |
|---|---|---|---|---|
| `/api/auth/login` | POST | No | `{ email, password }` | `{ ok, error? }` |
| `/api/auth/logout` | POST | Session | — | `{ ok: true }` |
| `/api/auth/magic-link` | POST | No | `{ email, fullName, next? }` | `{ ok, message }` |
| `/api/auth/forgot-password` | POST | No | `{ email, next? }` | `{ ok, message }` |
| `/api/auth/update-password` | POST | Yes | `{ password }` | `{ ok }` |

**External service:** Supabase Auth
**DB tables touched:** `identity.profiles`, `identity.subjects`

---

### Astrology — `/api/astro/`

| Route | Method | Auth | Query Params | Notes |
|---|---|---|---|---|
| `/api/astro/today` | GET | No | `date?`, `systemType?` | Returns horoscope + moon + transits for today |
| `/api/astro/birth-chart` | POST | Yes + Pro | `{ subjectId, chartType?, systemType? }` | Requires `birth_chart.full` entitlement |
| `/api/astro/compatibility` | GET | Yes + Pro | `signA`, `signB`, `systemType?` | Requires `compatibility.deep` entitlement |

**External service:** Astrology Provider API
**Rate limiting:** Yes — birth chart and compatibility are rate-limited per user per day

**Response shape (today):**
```json
{
  "data": {
    "moon": { "phaseName": "Waning Gibbous", "illuminationPct": 72, "sign": "libra" },
    "transits": [
      { "title": "Venus trine Pluto", "transitingPlanet": "Venus", "targetPlanet": "Pluto", "aspectType": "trine", "interpretation": "..." }
    ],
    "events": [
      { "title": "Venus enters Aries", "eventType": "ingress", "significance": "high", "eventAt": "2026-03-21T14:00:00Z" }
    ]
  }
}
```

---

### Dashboard — `/api/dashboard/`

#### Profile

| Route | Method | Auth | Params | Notes |
|---|---|---|---|---|
| `/api/dashboard/profile` | GET | Yes | — | Returns user profile + birth data + sun sign |
| `/api/dashboard/profile` | PATCH | Yes | See below | Updates profile and/or birth data |

PATCH body fields:
```typescript
{
  displayName?: string
  gender?: 'female' | 'male' | 'non_binary'
  relationshipStatus?: 'single' | 'engaged' | 'married' | 'soulmate' | 'difficult'
  birthDate?: string          // "YYYY-MM-DD"
  birthTime?: string          // "HH:MM"
  birthTimezone?: string      // "Asia/Dubai"
  birthPlaceName?: string     // "Dubai, UAE"
}
```

**DB tables:** `identity.profiles` + `identity.subjects`

#### Horoscope

| Route | Method | Auth | Query Params | Notes |
|---|---|---|---|---|
| `/api/dashboard/horoscope` | GET | No | `sign` (required), `date?`, `systemType?` | Falls back to static JSON if API fails |

**Response:**
```json
{
  "data": {
    "main": {
      "title": "Forward with clarity",
      "text": "You are ready to move from planning into action...",
      "energy": 80,
      "emotionalTone": "Confident",
      "challenges": ["Moving too fast", "Ignoring details"],
      "opportunities": ["Execution", "Visible progress"]
    },
    "categories": {
      "your-day": { "text": "...", "rating": 4, "keywords": ["momentum", "focus"] },
      "love":     { "text": "...", "rating": 3, "keywords": ["magnetic", "deep connection"] },
      "health":   { "text": "...", "rating": 4, "keywords": ["vitality", "grounding"] },
      "career":   { "text": "...", "rating": 5, "keywords": ["ambition", "results"] }
    }
  }
}
```

#### Advisors

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/dashboard/advisors` | GET | No | Returns all advisors list |
| `/api/dashboard/advisors/[slug]` | GET | No | Single advisor detail |
| `/api/dashboard/advisors/[slug]/messages` | GET | Yes | Chat history |
| `/api/dashboard/advisors/[slug]/messages` | POST | Yes | Send message — costs 1 credit |

POST message body: `{ content: string, sessionId?: string }`
POST message response: `{ message: ChatMessage, creditBalance: number }`

**Credit deduction flow:**
1. Deduct 1 credit (atomic DB operation)
2. Call OpenAI with user message + advisor persona + user's sign context
3. Save AI response to chat session
4. Return message + updated credit balance
5. On AI failure → automatically refund the credit

#### Features

| Route | Method | Auth | Returns |
|---|---|---|---|
| `/api/dashboard/features/tarot` | GET | No | Full 78-card deck |
| `/api/dashboard/features/magic-ball` | GET | No | `{ answers[], suggestedQuestions[] }` |
| `/api/dashboard/features/reports` | GET | No | Report product catalog |
| `/api/dashboard/features/reports/[slug]` | GET | No | Full report with sections |
| `/api/dashboard/features/stories` | GET | No | Story categories list |
| `/api/dashboard/features/stories/[slug]` | GET | No | Full story article |

---

### Billing — `/api/billing/`

| Route | Method | Auth | Returns |
|---|---|---|---|
| `/api/billing/plans` | GET | No | `{ plans[], prices[] }` — cached 1 hour |
| `/api/billing/subscription` | GET | Yes | `{ subscription, credits: { balance } }` |

**Subscription response:**
```json
{
  "subscription": {
    "id": "sub_xxx",
    "planCode": "pro",
    "status": "active",
    "currentPeriodEnd": "2026-04-21T00:00:00Z"
  },
  "credits": { "balance": 47 }
}
```

---

### Stripe — `/api/stripe/`

| Route | Method | Auth | Body | Returns |
|---|---|---|---|---|
| `/api/stripe/checkout` | POST | Yes | `{ lookup_key, success_url?, cancel_url?, trial? }` | `{ url }` — Stripe redirect |
| `/api/stripe/portal` | POST | Yes | `{ return_url? }` | `{ url }` — manage subscription |
| `/api/stripe/webhook` | POST | Signature | Raw Stripe event | `{ received: true }` |

**lookup_key examples:**
- `astroai_pro_monthly_usd`
- `astroai_premium_monthly_usd`
- `astroai_credits_100_usd`

**Webhook events handled:**
- `customer.subscription.created/updated/deleted`
- `charge.succeeded`
- `invoice.payment_succeeded/failed`

---

### Palm Reading — `/api/palm/`

| Route | Method | Auth | Body | Returns |
|---|---|---|---|---|
| `/api/palm/detect` | POST | No | `{ image: base64, side?, imageWidth?, imageHeight? }` | Detected line positions |
| `/api/palm/scan` | POST | Yes + Pro | Same as detect | Full scan → store → return interpretation |
| `/api/palm/interpret` | POST | Yes + Pro | `{ side, lines, confidence }` | AI text interpretation of palm lines |
| `/api/palm/history` | GET | No | `?clientId=`, `?limit=` | List of past scans |

**External services:**
- Roboflow ML API → detects palm lines in image
- OpenAI GPT-4 → interprets detected lines into reading

---

### Onboarding — `/api/onboarding/`

| Route | Method | Body/Params | Notes |
|---|---|---|---|
| `/api/onboarding/session` | POST | `{ category, source?, campaign? }` | Creates onboarding session |
| `/api/onboarding/session/[id]` | GET | — | Returns session + answers |
| `/api/onboarding/session/[id]` | PATCH | `{ currentStep?, status?, event? }` | Update session state |
| `/api/onboarding/session/[id]/answer` | POST | `{ stepId, value, currentStep? }` | Save a step answer |
| `/api/onboarding/session/[id]/complete` | POST | `{ leadEmail?, leadPhone? }` | Finish onboarding |

**Auto chart computation:** When user answers the `birth-place` step, the server immediately computes their natal chart (sun/moon/rising, planets, houses, aspects) from their birth data and stores it in the subject record.

---

### Location — `/api/location/`

| Route | Method | Params | Returns |
|---|---|---|---|
| `/api/location/autocomplete` | GET | `q` (min 2 chars), `limit?` (1–8) | `{ suggestions[], meta }` |

**External service:** Mapbox Geocoding API

---

## 5. Frontend Hooks — What Fetches What

All hooks live in `src/hooks/`. They use **TanStack Query** for caching and deduplicated fetching.

| Hook | File | What it fetches | Cache TTL | Fallback |
|---|---|---|---|---|
| `useHoroscope(date)` | `use-horoscope.ts` | `/api/dashboard/horoscope?sign=&date=` | 1 hour | `horoscope.json` |
| `useAlternativeHoroscope()` | `use-horoscope.ts` | Same endpoint, pulls `categories` | 1 hour | `alternative-horoscope.json` |
| `useDailyReadings()` | `use-horoscope.ts` | magic-ball + tarot + horoscope in parallel | 1 hour | `daily-readings.json` |
| `useTransits()` | `use-transits.ts` | `/api/astro/today?date=` | 1 hour | `transits.json` |
| `useRetrogrades()` | `use-transits.ts` | Same endpoint, filters retrograde events | 1 hour | `retrogrades.json` |
| `useMoonPhase()` | `use-moon-phase.ts` | `/api/astro/today?date=` | 1 hour | `moon.json` |
| `useCompatibility()` | `use-compatibility.ts` | Static JSON only | Never stale | `compatibility.json` |
| `useCompatibilityPair(a, b)` | `use-compatibility.ts` | `/api/astro/compatibility?signA=&signB=` | 30 days | — |
| `useUserProfile()` | `use-profile.ts` | `/api/dashboard/profile` | — | — |
| `useAdvisors()` | `use-advisors.ts` | `/api/dashboard/advisors` | 5 min | `advisors.json` |
| `useChatMessages(slug)` | `use-advisors.ts` | `/api/dashboard/advisors/[slug]/messages` | 0 (always fresh) | `chat-messages.json` |
| `useStoryCategories()` | `use-stories.ts` | `/api/dashboard/features/stories` | — | `stories.ts` |
| `useStoryArticle(slug)` | `use-stories.ts` | `/api/dashboard/features/stories/[slug]` | — | `stories.ts` |
| `usePlan()` | `use-plan.ts` | `/api/billing/subscription` | 5 min | free defaults |
| `useBillingPlans()` | `use-plan.ts` | `/api/billing/plans` | 1 hour | — |

### Hook dependency chain

```
useHoroscope
  └── requires: useUserProfile → sunSign

useAlternativeHoroscope
  └── requires: useUserProfile → sunSign

useDailyReadings
  └── requires: useUserProfile → sunSign
  └── calls: magic-ball API + tarot API + horoscope API in parallel

useCompatibilityPair
  └── requires: signA + signB (passed as args)

useBirthChart
  └── requires: useUserProfile → subjectId (or userId)
```

---

## 6. Supabase Database Schema

### Schema: `identity`

#### `identity.profiles`
Stores display preferences and Stripe customer link.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Same as `auth.users.id` |
| `display_name` | text | User's chosen display name |
| `gender` | enum | `female`, `male`, `non_binary` |
| `relationship_status` | enum | `single`, `engaged`, `married`, `soulmate`, `difficult` |
| `stripe_customer_id` | text | Nullable — set when first payment made |
| `updated_at` | timestamptz | Auto-updated |

#### `identity.subjects`
Stores birth data. A user can have multiple subjects (e.g. "me" + "my partner").

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Subject identifier |
| `user_id` | UUID (FK) | Links to `auth.users.id` |
| `is_primary` | boolean | `true` = the user themselves |
| `is_placeholder` | boolean | `true` if user hasn't entered birth data yet |
| `birth_date` | date | `YYYY-MM-DD`, nullable |
| `birth_time` | time | `HH:MM`, nullable |
| `birth_timezone` | text | `Asia/Dubai`, nullable |
| `birth_place_name` | text | Human-readable city name |
| `personalization_timezone` | text | Timezone for scheduling/display |
| `updated_at` | timestamptz | Auto-updated |

---

### Schema: `billing`

#### `billing.plan_catalog`
| Column | Type | Notes |
|---|---|---|
| `plan_code` | text (PK) | `free`, `pro`, `premium` |
| `display_name` | text | "Pro", "Premium" |
| `description` | text | Short description |
| `is_active` | boolean | Feature flag |
| `sort_order` | integer | Display order |

#### `billing.plan_price_versions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | — |
| `plan_code` | text (FK) | Links to `plan_catalog` |
| `stripe_price_id` | text | Stripe's internal price ID |
| `lookup_key` | text | e.g. `astroai_pro_monthly_usd` |
| `currency` | text | `usd`, `inr`, etc. |
| `billing_interval` | enum | `month`, `year`, `one_time` |
| `amount_minor` | integer | Price in smallest unit (cents/paise) |
| `is_active` | boolean | — |

#### `billing.subscriptions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Internal subscription ID |
| `user_id` | UUID (FK) | Links to `auth.users.id` |
| `plan_code` | text (FK) | Current plan |
| `status` | enum | `active`, `trialing`, `past_due`, `canceled`, `paused` |
| `provider` | text | `stripe` |
| `provider_subscription_id` | text | Stripe subscription ID |
| `current_period_start` | timestamptz | — |
| `current_period_end` | timestamptz | — |

#### `billing.credit_transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | — |
| `user_id` | UUID (FK) | — |
| `amount` | integer | Positive = credit added, Negative = deducted |
| `reason` | text | e.g. `advisor_chat`, `refund`, `purchase` |
| `session_id` | UUID | Links to chat session |
| `created_at` | timestamptz | — |

---

### Supabase Storage

#### Bucket: `tarot-cards`
- 78 files named `{slug}.jpg`
- Examples: `major-00.jpg` (The Fool), `major-21.jpg` (The World), `cups-07.jpg`, `swords-13.jpg`
- Public bucket — served via CDN URL: `{SUPABASE_URL}/storage/v1/object/public/tarot-cards/{slug}.jpg`

---

## 7. Data Types & Schema Examples

### HoroscopeReading
```typescript
{
  date: "2026-03-21",
  title: "Forward with clarity",
  text: "You are ready to move from planning into action...",
  energy: 80,                           // 0-100, drives biorhythm display
  emotionalTone: "Confident",
  challenges: ["Moving too fast", "Ignoring details"],
  opportunities: ["Execution", "Visible progress"]
}
```

### BirthChartData
```typescript
{
  bigThree: {
    sun:       { sign: "scorpio",    degree: 15.4, glyph: "♏" },
    moon:      { sign: "pisces",     degree: 8.2,  glyph: "♓" },
    ascendant: { sign: "cancer",     degree: 22.1, glyph: "♋" }
  },
  stellarComposition: {
    fire: 12, earth: 28, air: 15, water: 45,
    cardinal: 35, fixed: 42, mutable: 23
  },
  planets: [
    { name: "Venus", glyph: "♀", sign: "libra", house: 4, degree: 7.3,
      isRetrograde: false, description: "Harmony in home life" }
    // ... 10 total planets
  ],
  houses: [
    { number: 1, sign: "cancer", degree: 22.1 }
    // ... 12 total houses
  ],
  aspects: [
    { planet1: "Sun", planet2: "Moon", type: "trine", orb: 2.1 }
    // ... multiple aspects
  ]
}
```

### CompatibilityScore (pair)
```typescript
{
  overall: 94,
  love: 96,
  career: 82,
  friendship: 90,
  sex: 98,
  summary: "A deeply intuitive and emotionally intense bond...",
  strengths: ["Profound emotional understanding", "Unshakeable loyalty"],
  challenges: ["Both can be too possessive", "Difficulty letting go"]
}
```

### TarotCard
```typescript
{
  id: "the-star",
  name: "The Star",
  number: 17,
  arcana: "major",
  uprightMeaning: "Hope, renewal, and spiritual guidance illuminate your path.",
  reversedMeaning: "Despair, loss of faith, disconnection.",
  tipOfDay: "Trust in the process and keep moving forward.",
  imageSlug: "major-17"      // → tarot-cards/major-17.jpg in Supabase Storage
}
```

### MoonPhaseData
```typescript
{
  name: "Waning Gibbous",
  illumination: 72,           // % lit
  age: 17.5,                  // days since New Moon
  sign: "libra",
  isWaxing: false,
  startDate: "2026-03-19T00:00:00Z",
  endDate: "2026-03-22T00:00:00Z",
  signInterpretation: "",
  phaseInterpretation: "",
  tags: []
}
```

### UserProfile (from `/api/dashboard/profile`)
```typescript
{
  userId: "uuid-xxx",
  isPlaceholder: false,        // true = no birth data entered yet
  sunSign: "scorpio",          // null if no birth date
  timezone: "Asia/Dubai"
}
```

---

## 8. Data Flow Diagrams

### Today Page — Horoscope Section

```
User opens Today tab
  │
  ├── useUserProfile()
  │     └── GET /api/dashboard/profile
  │           └── DB: identity.subjects (birth_date → sun sign)
  │
  ├── useHoroscope(today)
  │     └── GET /api/dashboard/horoscope?sign={sign}&date={date}
  │           ├── Try: Astrology Provider API → live reading
  │           └── Fail: src/data/horoscope.json (static fallback)
  │
  ├── useAlternativeHoroscope()
  │     └── Same endpoint → pulls categories (love/career/health/your-day)
  │
  ├── useDailyReadings()
  │     ├── GET /api/dashboard/features/magic-ball → static answers
  │     ├── GET /api/dashboard/features/tarot → 78 cards, picks by date hash
  │     └── GET /api/dashboard/horoscope → dos/donts from challenges/opportunities
  │
  └── useCompatibility()
        └── src/data/compatibility.json (always static)
```

### Advisor Chat — Sending a Message

```
User types message + hits Send
  │
  └── POST /api/dashboard/advisors/{slug}/messages
        │  body: { content: "Will I get the job?" }
        │
        ├── 1. Verify Supabase auth session
        ├── 2. Check feature entitlement (advisor.chat)
        ├── 3. Check daily rate limit
        ├── 4. DEDUCT 1 credit (atomic write to credit_transactions)
        ├── 5. Build AI prompt:
        │     - advisor persona (from advisors.json)
        │     - user's sun sign
        │     - conversation history
        │     - user message
        ├── 6. Call OpenAI API → get AI response
        ├── 7. Save both messages to chat session (DB)
        ├── 8. Return { message, creditBalance }
        └── On step 6 failure → REFUND credit + return error
```

### Stripe Checkout Flow

```
User taps "Upgrade to Pro"
  │
  └── POST /api/stripe/checkout { lookup_key: "astroai_pro_monthly_usd" }
        │
        ├── 1. Auth check
        ├── 2. Check 30-min idempotency cache (prevent duplicate sessions)
        ├── 3. Fetch price from billing.plan_price_versions by lookup_key
        ├── 4. Get/create Stripe customer (links to identity.profiles.stripe_customer_id)
        ├── 5. Create Stripe Checkout Session
        ├── 6. Cache session URL for 30 min
        └── 7. Return { url } → browser redirects to Stripe

After payment:
  └── Stripe sends webhook → POST /api/stripe/webhook
        ├── Verify signature
        ├── Handle subscription.created → write to billing.subscriptions
        └── Update subscription status on future events
```

---

## 9. Billing & Entitlement System

### Plans

| Plan | Code | Features Unlocked |
|---|---|---|
| Free | `free` | Horoscope, Stories, Basic Tarot, Magic Ball |
| Pro | `pro` | All Free + Palm Reading, Soulmate, Full Birth Chart, Deep Compatibility, All Tarot Modes, Prediction Report |
| Premium | `premium` | All Pro + priority advisor chat, extended reports |

### Feature Gate Map (`src/hooks/use-plan.ts`)

```typescript
const FEATURE_CAPABILITIES = {
  'horoscope.personal':  'pro',
  'birth_chart.full':    'pro',
  'compatibility.deep':  'pro',
  'palm.scan':           'pro',
  'soulmate.generate':   'pro',
  'tarot.modes':         'pro',
  'prediction.report':   'pro',
}
```

### How Gating Works

- **Frontend:** `canAccess('palm.scan')` returns `false` → shows PRO badge, disables feature
- **Backend:** API routes call `checkEntitlement(userId, 'palm.scan')` → returns `{ locked: true, requiredPlan: 'pro' }` (HTTP 200, not 403) so the UI can show the upgrade prompt gracefully

### Credit System

- Advisor chat costs **1 credit per message**
- Credits are purchased as one-time packs via Stripe
- Balance tracked in `billing.credit_transactions` (sum of all rows for a user)
- Atomically deducted before AI call, refunded if call fails

---

## 10. External Services & Environment Variables

| Service | Purpose | Key Env Vars |
|---|---|---|
| **Supabase Auth** | Login, sessions, magic links | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Supabase DB** | User data, billing, chats | `SUPABASE_DB_URL` |
| **Supabase Storage** | Tarot card images (78 JPGs) | Same URL as above |
| **Astrology API** | Horoscope, birth chart, moon, transits | `ASTROLOGY_PROVIDER`, `ASTROLOGY_API_KEY`, `ASTROLOGY_API_BASE_URL` |
| **Stripe** | Payments, subscriptions, webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **OpenAI** | Advisor chat AI, palm interpretation | `OPENAI_API_KEY`, `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID` |
| **Roboflow** | Palm line detection (ML model) | `ROBOFLOW_API_KEY`, `ROBOFLOW_MODEL_ID` |
| **Mapbox** | Birth place location search | `MAPBOX_ACCESS_TOKEN` |
| **Sentry** (optional) | Error tracking | `NEXT_PUBLIC_SENTRY_DSN` |

---

## 11. Layman Summary (Non-Technical)

### What is AstroAI and how does data flow through it?

Think of AstroAI as a mystical assistant that knows about astrology, the cosmos, and your personal cosmic blueprint. Here's how the pieces fit together in plain English:

---

### Where does the information come from?

**Your personal data** lives in our own secure database (Supabase). This includes your name, when and where you were born, your account settings, and your subscription status. We never share this.

**Astrology data** (horoscope readings, birth chart calculations, moon phases, planetary transits) comes from a specialist astrology API — think of it as an expert calculator that takes your birth details and returns cosmic insights. If that service is temporarily unavailable, the app automatically falls back to pre-written backup data so you always see something meaningful.

**AI conversations** with advisors are powered by OpenAI (the same technology behind ChatGPT). Each advisor has a distinct personality and specialty, and the AI is given your zodiac sign as context so responses feel personalized.

**Palm reading** uses two AI services: one to detect the lines in your palm photo (like a computer vision scanner), and another to interpret what those lines mean in an astrology context.

**Payments** go through Stripe — we never store your card details ourselves.

---

### What's the same for everyone vs. what's personal to you?

**Same for everyone on a given day:**
- Moon phase and which zodiac sign the moon is in (the moon moves every 2.5 days, so everyone sees the same moon)
- Active planetary retrogrades (Mercury retrograde affects everyone equally)
- Today's story articles about astrology topics
- The "card of the day" tarot card (it's picked by a formula using today's date)

**Personalized to your sun sign** (just needs your birthday, not time/place):
- Your daily horoscope reading
- Love tips and dating advice
- Do/Don't recommendations
- Your best compatibility matches

**Deeply personalized** (needs your exact birth date + time + city):
- Your full birth chart (shows where every planet was at the moment you were born)
- Which planetary transits are currently affecting your specific chart
- Deep compatibility analysis between you and another sign
- Palm reading interpretation (uses your uploaded photo)

---

### How does the app know who you are?

When you log in, the app asks our database for your profile. Your profile contains your birth date (which tells us your sun sign) and optionally your birth time and city (which enables the deeper features). All subsequent data fetching uses this information to personalize your experience.

If you haven't entered your birth data yet, the app still works — it just shows general content and prompts you to add your details to unlock the personalized features.

---

### How does payment and access work?

There are three tiers:
- **Free** — you can read horoscopes, browse stories, use basic tarot and the magic ball
- **Pro** — unlocks palm reading, full birth chart, deep compatibility, soulmate feature, all tarot modes, and the prediction report
- **Premium** — all Pro features plus priority advisor access

When you upgrade, Stripe handles the payment, and our system is automatically notified to unlock your features. Advisor chat uses a separate credit system — each message costs 1 credit, which you purchase in packs.

---

### What happens if an API goes down?

The app is designed to be resilient. For every live data source, there's a pre-written fallback (static data file). So if the astrology API is temporarily unavailable:
- You still see a horoscope (from the backup file)
- Moon phases still display
- Transit information still shows
- The only thing that won't work is features that require real-time computation (like birth chart generation for a new user)

This "always show something" approach ensures the app never feels broken to the user.

---

*Document maintained in `DATA_ARCHITECTURE.md` at the repo root.*
