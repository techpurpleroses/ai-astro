# AstroAI — Supabase Integration Plan (Production-Grade SaaS)

## Context

AstroAI is currently a pure frontend demo: all data is static JSON, no auth, no backend, no real users. To become a production SaaS we need to:
- Authenticate users and store their birth data
- Compute real astrological data (planetary positions, transits, birth charts) using Swiss Ephemeris — the industry standard ephemeris library used by professional astrology software (Solar Fire, Kepler, Astro Gold)
- Serve daily content (horoscopes, moon, transits) from a database refreshed by cron jobs
- Enable real-time AI-powered advisor chat (AI personas) with per-minute credit billing
- Store all user-specific data (birth chart, chat history, credits) securely with RLS

**Advisors**: AI personas — no human logins. All responses generated via Claude API.
**Content source**: Swiss Ephemeris (`swisseph` npm) for all calculations. Third-party licensed horoscope content API for daily sign readings. Pre-written interpretation database in Supabase for chart interpretations.
**Billing**: Subscription tiers (Free/Premium/Pro) + pay-per-minute credits for advisor chats.

---

## Industry-Standard Content Architecture

### Calculation Layer — Swiss Ephemeris
Install: `swisseph` (Node.js bindings for the Swiss Ephemeris C library)
Runs server-side (Edge Functions + API routes). Computes:
- All planetary positions (ecliptic longitude, latitude, declination)
- House cusps (Placidus or Whole Sign — user selectable)
- Aspects between planets (orb thresholds per aspect type)
- Moon phase (illumination %, phase name, age in days)
- Retrograde periods (stations direct/retrograde)
- Transits to natal chart (transiting planet × natal planet × aspect)

**Supporting libraries:**
- `timezone-boundary-builder` or Google Maps Time Zone API — resolve timezone from lat/lng at birth time
- `@mapbox/mapbox-sdk` or Google Places API — geocode city name → lat/lng during onboarding

### Interpretation Layer — Pre-written Database
The `interpretation_texts` table in Supabase stores professionally written text for every meaningful astrological combination. No AI is used for interpretations. Zero-AI approach for all astrological content.

### Daily Horoscope Content
Use a licensed horoscope content API (e.g., via RapidAPI — "Horoscope Astrology" or "Daily Horoscope" endpoints) that returns sign-specific daily readings. Fetched by cron at midnight UTC, stored in `daily_horoscopes` table for 12 signs × 1 date.

---

## Data Classification

### Stays as TypeScript constants (never in DB)
`src/lib/constants.ts` — zodiac glyphs/names/elements/colors, planet names/glyphs/colors, aspect colors, SVG math constants. These are compile-time invariants.

### Seeded once into Supabase (static reference, admin-editable)
- `compatibility_pairs` — 144 sign pair scores (seed from current compatibility.json)
- `tarot_cards` — 78 card definitions with upright/reversed meanings
- `magic_ball_answers` — Answer templates with sentiments
- `advisors` — AI persona profiles (name, specialty, bio, rate, avatar)
- `interpretation_texts` — Pre-written texts for planet×sign, planet×house, transit×sign combinations

### Refreshed daily by cron (global, not per-user)
- `daily_horoscopes` — 12 sign readings per date (from licensed content API)
- `daily_category_readings` — Love/Health/Career/Your Day per sign per date
- `daily_readings` — Universal: tarot of the day, lucky number, love tip, dos/donts
- `moon_phases` — Current phase data (computed via Swiss Ephemeris)
- `moon_events` — Upcoming lunar calendar
- `planetary_transits` — Active world transits (computed via Swiss Ephemeris)
- `planetary_retrogrades` — Retrograde calendar (computed via Swiss Ephemeris)
- `astro_events` — Ingresses, eclipses, stations

### User-specific (private, RLS-enforced)
- `profiles` — Birth data, zodiac sign, credits balance, subscription tier
- `birth_charts` — Computed natal chart per user
- `user_transit_readings` — Personal transits (transiting planets to user's natal chart)
- `chat_sessions` — Advisor chat sessions with timer and cost
- `chat_messages` — Full message history
- `credit_transactions` — Credit purchase and deduction ledger
- `user_saved_readings` — Bookmarked horoscopes, tarot pulls, etc.

---

## Database Schema

### Core Types / Enums
```sql
CREATE TYPE zodiac_sign AS ENUM (
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces'
);
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'pro');
CREATE TYPE chat_role AS ENUM ('user', 'advisor');
CREATE TYPE transit_duration AS ENUM ('short_term', 'long_term');
CREATE TYPE moon_phase_name AS ENUM (
  'New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
  'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'
);
CREATE TYPE moon_event_type AS ENUM ('New Moon','First Quarter','Full Moon','Last Quarter');
CREATE TYPE astro_event_type AS ENUM ('ingress','aspect','eclipse','retrograde','station');
CREATE TYPE significance AS ENUM ('low','medium','high');
CREATE TYPE intensity AS ENUM ('low','medium','high');
CREATE TYPE transaction_type AS ENUM ('purchase','session_charge','refund','bonus');
CREATE TYPE interpretation_type AS ENUM (
  'planet_sign','planet_house','transit_to_natal','natal_aspect','sign_house'
);
CREATE TYPE session_status AS ENUM ('active','ended','pending');
```

---

### Table: `profiles`
```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  birth_date      DATE NOT NULL,
  birth_time      TIME,                    -- NULL = unknown (reduces chart accuracy)
  birth_city      TEXT,
  birth_lat       DECIMAL(9,6),
  birth_lng       DECIMAL(9,6),
  birth_timezone  TEXT,                    -- IANA tz string e.g. 'America/New_York'
  zodiac_sign     zodiac_sign NOT NULL,    -- Sun sign (always known)
  moon_sign       zodiac_sign,             -- Requires birth_time
  rising_sign     zodiac_sign,             -- Requires birth_time + birth_location
  avatar_url      TEXT,
  credits_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  subscription    subscription_tier NOT NULL DEFAULT 'free',
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Table: `birth_charts`
```sql
CREATE TABLE birth_charts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  big_three         JSONB NOT NULL,  -- { sun:{sign,degree,glyph}, moon:{...}, ascendant:{...} }
  stellar_composition JSONB NOT NULL,-- { fire, earth, air, water, cardinal, fixed, mutable }
  planets           JSONB NOT NULL,  -- PlanetPosition[] array
  houses            JSONB NOT NULL,  -- HousePosition[] array (12 cusps)
  aspects           JSONB NOT NULL,  -- Aspect[] array
  house_system      TEXT NOT NULL DEFAULT 'Placidus',
  calculated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ephemeris_version TEXT
);
```

---

### Table: `advisors`
```sql
CREATE TABLE advisors (
  id               TEXT PRIMARY KEY,           -- kebab slug e.g. 'luna-rose'
  name             TEXT NOT NULL,
  specialty        TEXT NOT NULL,
  specialty_icon   TEXT NOT NULL,
  tagline          TEXT NOT NULL,
  bio              TEXT NOT NULL,
  zodiac_sign      TEXT NOT NULL,
  years_experience SMALLINT NOT NULL,
  rate_per_minute  DECIMAL(5,2) NOT NULL,      -- cost in credits per minute
  skills           TEXT[] NOT NULL DEFAULT '{}',
  languages        TEXT[] NOT NULL DEFAULT '{}',
  response_time    TEXT NOT NULL DEFAULT '< 2 min',
  total_sessions   INTEGER NOT NULL DEFAULT 0,
  review_count     INTEGER NOT NULL DEFAULT 0,
  rating           DECIMAL(3,2) NOT NULL DEFAULT 5.0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url       TEXT,
  system_prompt    TEXT NOT NULL,              -- Claude API system prompt for this persona
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Table: `daily_horoscopes`
```sql
CREATE TABLE daily_horoscopes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign           zodiac_sign NOT NULL,
  date           DATE NOT NULL,
  title          TEXT NOT NULL,
  text           TEXT NOT NULL,
  energy         SMALLINT NOT NULL CHECK (energy BETWEEN 0 AND 100),
  emotional_tone TEXT NOT NULL,
  challenges     TEXT[] NOT NULL DEFAULT '{}',
  opportunities  TEXT[] NOT NULL DEFAULT '{}',
  source         TEXT,                         -- content provider attribution
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sign, date)
);
CREATE INDEX idx_daily_horoscopes_date_sign ON daily_horoscopes (date, sign);
```

---

### Table: `daily_category_readings`
```sql
CREATE TABLE daily_category_readings (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign     zodiac_sign NOT NULL,
  date     DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('your-day','love','health','career')),
  text     TEXT NOT NULL,
  rating   SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (sign, date, category)
);
CREATE INDEX idx_daily_category_date_sign ON daily_category_readings (date, sign);
```

---

### Table: `daily_readings`
```sql
CREATE TABLE daily_readings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                      DATE NOT NULL UNIQUE,
  tarot_card_id             TEXT NOT NULL REFERENCES tarot_cards(id),
  love_tip                  TEXT NOT NULL,
  love_detail               TEXT NOT NULL,
  dos                       TEXT[] NOT NULL DEFAULT '{}',
  donts                     TEXT[] NOT NULL DEFAULT '{}',
  lucky_number              SMALLINT NOT NULL,
  lucky_number_explanation  TEXT NOT NULL,
  trending_question         TEXT NOT NULL,
  magic_ball_answers        JSONB NOT NULL,   -- MagicBallAnswer[] snapshot for the day
  suggested_questions       TEXT[] NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Table: `tarot_cards`
```sql
CREATE TABLE tarot_cards (
  id              TEXT PRIMARY KEY,          -- e.g. 'the-star'
  name            TEXT NOT NULL,
  number          SMALLINT,
  arcana          TEXT NOT NULL CHECK (arcana IN ('major','minor')),
  suit            TEXT,                      -- NULL for major arcana
  upright_meaning TEXT NOT NULL,
  reversed_meaning TEXT NOT NULL,
  tip_of_day      TEXT NOT NULL,
  image_slug      TEXT NOT NULL,
  color           TEXT NOT NULL             -- hex for UI theming
);
```

---

### Table: `magic_ball_answers`
```sql
CREATE TABLE magic_ball_answers (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer    TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive','neutral','negative'))
);
```

---

### Table: `moon_phases`
```sql
CREATE TABLE moon_phases (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                 DATE NOT NULL UNIQUE,
  phase_name           moon_phase_name NOT NULL,
  illumination         DECIMAL(5,2) NOT NULL,
  age_days             DECIMAL(6,3) NOT NULL,
  sign                 zodiac_sign NOT NULL,
  phase_start_date     DATE NOT NULL,
  phase_end_date       DATE NOT NULL,
  is_waxing            BOOLEAN NOT NULL,
  phase_interpretation TEXT NOT NULL,
  sign_interpretation  TEXT NOT NULL,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Table: `moon_events`
```sql
CREATE TABLE moon_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  type        moon_event_type NOT NULL,
  sign        zodiac_sign NOT NULL,
  description TEXT NOT NULL,
  UNIQUE (date, type)
);
CREATE INDEX idx_moon_events_date ON moon_events (date);
```

---

### Table: `planetary_transits`
```sql
CREATE TABLE planetary_transits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transiting_planet TEXT NOT NULL,
  natal_planet      TEXT,                   -- NULL = world transit (no natal reference)
  aspect            TEXT NOT NULL,
  orb               DECIMAL(5,2) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  duration_type     transit_duration NOT NULL,
  intensity         intensity NOT NULL,
  title             TEXT NOT NULL,
  interpretation    TEXT NOT NULL,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  is_world_transit  BOOLEAN NOT NULL DEFAULT TRUE,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transits_dates ON planetary_transits (start_date, end_date);
```

---

### Table: `user_transit_readings`
Personal transits = transiting planets hitting the user's NATAL chart positions.
```sql
CREATE TABLE user_transit_readings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transiting_planet TEXT NOT NULL,
  natal_planet      TEXT NOT NULL,
  aspect            TEXT NOT NULL,
  orb               DECIMAL(5,2) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  duration_type     transit_duration NOT NULL,
  intensity         intensity NOT NULL,
  title             TEXT NOT NULL,
  interpretation    TEXT NOT NULL,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, transiting_planet, natal_planet, aspect, start_date)
);
CREATE INDEX idx_user_transits_user_dates ON user_transit_readings (user_id, start_date, end_date);
```

---

### Table: `planetary_retrogrades`
```sql
CREATE TABLE planetary_retrogrades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet         TEXT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  sign           zodiac_sign NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT FALSE,
  interpretation TEXT NOT NULL,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (planet, start_date)
);
```

---

### Table: `astro_events`
```sql
CREATE TABLE astro_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date         DATE NOT NULL,
  title        TEXT NOT NULL,
  type         astro_event_type NOT NULL,
  description  TEXT NOT NULL,
  significance significance NOT NULL DEFAULT 'medium',
  UNIQUE (date, title)
);
CREATE INDEX idx_astro_events_date ON astro_events (date);
```

---

### Table: `compatibility_pairs`
```sql
CREATE TABLE compatibility_pairs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign1      zodiac_sign NOT NULL,
  sign2      zodiac_sign NOT NULL,
  overall    SMALLINT NOT NULL CHECK (overall BETWEEN 0 AND 100),
  love       SMALLINT NOT NULL CHECK (love BETWEEN 0 AND 100),
  career     SMALLINT NOT NULL CHECK (career BETWEEN 0 AND 100),
  friendship SMALLINT NOT NULL CHECK (friendship BETWEEN 0 AND 100),
  intimacy   SMALLINT NOT NULL CHECK (intimacy BETWEEN 0 AND 100),
  summary    TEXT NOT NULL,
  strengths  TEXT[] NOT NULL DEFAULT '{}',
  challenges TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (sign1, sign2)
);
```

---

### Table: `interpretation_texts`
Central repository of all astrological interpretation copy. Zero AI — seeded by professional astrologers.
```sql
CREATE TABLE interpretation_texts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       interpretation_type NOT NULL,
  planet     TEXT,           -- e.g. 'Sun', 'Moon', 'Mars'
  sign       zodiac_sign,
  house      SMALLINT CHECK (house BETWEEN 1 AND 12),
  aspect     TEXT,           -- e.g. 'trine', 'square'
  planet2    TEXT,           -- for natal_aspect type
  short_text TEXT NOT NULL,  -- 1-2 sentences (for cards/badges)
  long_text  TEXT NOT NULL,  -- Full paragraph (for detail sheets)
  source     TEXT,           -- attribution
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interp_lookup ON interpretation_texts (type, planet, sign, house);
```

---

### Table: `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  advisor_id        TEXT NOT NULL REFERENCES advisors(id),
  status            session_status NOT NULL DEFAULT 'pending',
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,
  credits_per_minute DECIMAL(5,2) NOT NULL,  -- locked in at session start
  total_credits_used DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON chat_sessions (user_id, created_at DESC);
```

---

### Table: `chat_messages`
```sql
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  advisor_id      TEXT NOT NULL REFERENCES advisors(id),
  role            chat_role NOT NULL,
  content         TEXT NOT NULL,
  tarot_card_data JSONB,          -- optional inline tarot card in message
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_user_advisor ON chat_messages (user_id, advisor_id, created_at ASC);
CREATE INDEX idx_messages_session ON chat_messages (session_id, created_at ASC);
```

---

### Table: `credit_transactions`
```sql
CREATE TABLE credit_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                   transaction_type NOT NULL,
  credits_delta          DECIMAL(10,2) NOT NULL,   -- positive = earned, negative = spent
  credits_balance_after  DECIMAL(10,2) NOT NULL,
  description            TEXT NOT NULL,
  session_id             UUID REFERENCES chat_sessions(id),
  stripe_payment_intent  TEXT,                      -- for purchase type
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_user ON credit_transactions (user_id, created_at DESC);
```

---

### Table: `user_saved_readings`
```sql
CREATE TABLE user_saved_readings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,   -- 'horoscope' | 'tarot' | 'compatibility' | 'transit'
  reading_data JSONB NOT NULL,
  saved_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_user ON user_saved_readings (user_id, saved_at DESC);
```

---

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE birth_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transit_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_readings ENABLE ROW LEVEL SECURITY;

-- profiles: users access only their own row
CREATE POLICY "own profile read"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- birth_charts: own row only
CREATE POLICY "own chart"  ON birth_charts FOR ALL USING (auth.uid() = user_id);

-- user_transit_readings: own rows only
CREATE POLICY "own transits" ON user_transit_readings FOR ALL USING (auth.uid() = user_id);

-- chat_sessions: own sessions only
CREATE POLICY "own sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- chat_messages: own messages only
CREATE POLICY "own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- credit_transactions: read own only (write via service_role only)
CREATE POLICY "own transactions read" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- user_saved_readings: own records only
CREATE POLICY "own saved" ON user_saved_readings FOR ALL USING (auth.uid() = user_id);

-- Public tables (authenticated users can read, only service_role can write):
-- advisors, daily_horoscopes, daily_category_readings, daily_readings,
-- moon_phases, moon_events, planetary_transits, planetary_retrogrades,
-- astro_events, compatibility_pairs, tarot_cards, magic_ball_answers,
-- interpretation_texts
-- (No RLS = default read for authenticated via anon key; writes via service_role in cron)
```

---

## Supabase Features Used

| Feature | Purpose |
|---------|---------|
| **Auth** | Email/password + Google OAuth. Session tokens → middleware |
| **Database** | PostgreSQL — all 20+ tables above |
| **Realtime** | Subscribe to `chat_messages` for live chat updates |
| **Storage** | Bucket `avatars` for user profile photos; bucket `advisor-images` |
| **Edge Functions** | Daily cron jobs for ephemeris data + content refresh |
| **Secrets** | API keys (Stripe, horoscope content API, Claude API) in Vault |

---

## Supabase Client Files

**New files to create:**
- `src/lib/supabase/client.ts` — Browser client (anon key)
- `src/lib/supabase/server.ts` — Server client (cookie-based SSR)
- `src/lib/supabase/admin.ts` — Service role client (API routes only, never in browser)
- `src/lib/supabase/types.ts` — Generated DB types (`supabase gen types typescript`)
- `src/middleware.ts` — Auth protection + onboarding redirect

---

## Next.js Middleware

```typescript
// src/middleware.ts
// Protected routes: all (dashboard), redirect to /login if no session
// If session but !onboarding_complete → redirect to /onboarding
// Public routes: /login, /signup, /onboarding, /
```

---

## API Routes

All under `src/app/api/`:

### Global content (authenticated, no user-specificity)
| Route | Method | Description |
|-------|--------|-------------|
| `horoscope` | GET | `?sign=&date=` → query `daily_horoscopes` |
| `alternative-horoscope` | GET | `?sign=&date=` → query `daily_category_readings` |
| `daily-readings` | GET | `?date=` → query `daily_readings` JOIN `tarot_cards` |
| `moon` | GET | `?date=` → query `moon_phases` + upcoming `moon_events` |
| `transits` | GET | `?date=` → query `planetary_transits` + `planetary_retrogrades` + `astro_events` |
| `compatibility` | GET | `?sign1=&sign2=` → query `compatibility_pairs` |
| `advisors` | GET | List all active advisors |
| `advisors/[id]` | GET | Single advisor |

### User-specific (authenticated + RLS)
| Route | Method | Description |
|-------|--------|-------------|
| `profile` | GET/POST | Read or upsert `profiles` |
| `birth-chart` | GET | Query `birth_charts` for current user |
| `birth-chart/compute` | POST | Swiss Ephemeris → upsert `birth_charts` + `user_transit_readings` |
| `chat/[advisorId]/messages` | GET | Paginated messages, ordered by `created_at` |
| `chat/[advisorId]/messages` | POST | Insert user message → call Claude API → insert advisor reply → deduct credits |
| `chat/[advisorId]/session` | POST | Start/end chat session |
| `credits` | GET | Current balance from `profiles` |
| `credits/purchase` | POST | Create Stripe checkout session for credit bundle |
| `credits/webhook` | POST | Stripe webhook → update `profiles.credits_balance` + insert transaction |

---

## Hook Migration Plan

Each existing React Query hook migrates from JSON import → Supabase client fetch via API route:

| Hook | Current | New data source |
|------|---------|----------------|
| `useHoroscope(date)` | `@/data/horoscope.json` | `GET /api/horoscope?sign={userSign}&date={date}` |
| `useAlternativeHoroscope()` | `@/data/alternative-horoscope.json` | `GET /api/alternative-horoscope?sign={userSign}&date={today}` |
| `useDailyReadings()` | `@/data/daily-readings.json` | `GET /api/daily-readings?date={today}` |
| `useMoonPhase()` | `@/data/moon.json` | `GET /api/moon?date={today}` |
| `useTransits()` | `@/data/transits.json` | `GET /api/transits?date={today}` |
| `useRetrogrades()` | `@/data/retrogrades.json` | Merged into `GET /api/transits` response |
| `useBirthChart()` | `@/data/birth-chart.json` | `GET /api/birth-chart` (user-specific) |
| `useCompatibility()` | `@/data/compatibility.json` | `GET /api/compatibility?sign1=&sign2=` |
| `useZodiacSigns()` | `@/data/zodiac-signs.json` | Stays as static import (never changes) |
| `useAdvisors()` | `@/data/advisors.json` | `GET /api/advisors` |
| `useAdvisor(id)` | derived from useAdvisors | `GET /api/advisors/{id}` |
| `useChatMessages(advisorId)` | `@/data/chat-messages.json` | `GET /api/chat/{advisorId}/messages` + Realtime subscription |
| `useSuggestedQuestions()` | `@/data/chat-messages.json` | Merged into `GET /api/advisors/{id}` response |

**New hooks to add:**
- `useProfile()` → GET /api/profile (user profile + birth data)
- `useCredits()` → reactive credit balance from profile
- `useUserTransits()` → GET /api/birth-chart personal transits (user's natal chart × current sky)

---

## New Files & Directory Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # createBrowserClient()
│   │   ├── server.ts          # createServerClient() with cookie handling
│   │   ├── admin.ts           # createClient(serviceRoleKey) — server only
│   │   └── types.ts           # generated DB types
│   ├── ephemeris/
│   │   ├── calculate-chart.ts # Birth chart calculation via swisseph
│   │   ├── calculate-transits.ts # Transit calculation
│   │   └── moon-phase.ts      # Moon phase from ephemeris
│   └── stripe/
│       └── client.ts          # Stripe SDK init
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── onboarding/
│   │   └── page.tsx           # 3-step birth data wizard
│   └── api/
│       ├── horoscope/route.ts
│       ├── alternative-horoscope/route.ts
│       ├── daily-readings/route.ts
│       ├── moon/route.ts
│       ├── transits/route.ts
│       ├── compatibility/route.ts
│       ├── advisors/route.ts
│       ├── advisors/[id]/route.ts
│       ├── profile/route.ts
│       ├── birth-chart/route.ts
│       ├── birth-chart/compute/route.ts
│       ├── chat/[advisorId]/messages/route.ts
│       ├── chat/[advisorId]/session/route.ts
│       ├── credits/route.ts
│       ├── credits/purchase/route.ts
│       └── credits/webhook/route.ts
├── middleware.ts
└── hooks/
    ├── use-profile.ts         # NEW
    ├── use-credits.ts         # NEW
    └── use-user-transits.ts   # NEW
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server only — never exposed to client

# External APIs
SWISS_EPHEMERIS_PATH=            # path to SE data files on server
GEOCODING_API_KEY=               # Google Maps or Mapbox key
TIMEZONE_API_KEY=                # Google Maps Time Zone API key (can reuse)
HOROSCOPE_CONTENT_API_KEY=       # Licensed horoscope content provider (RapidAPI)
HOROSCOPE_CONTENT_API_HOST=      # RapidAPI host header

# AI (advisor chat only)
ANTHROPIC_API_KEY=               # Claude API for AI advisor responses

# Billing
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=             # https://astroai.app
```

---

## User Onboarding Flow

1. `/signup` → Supabase Auth email/password or Google OAuth
2. Post-auth → middleware detects `onboarding_complete = false` → redirect to `/onboarding`
3. Onboarding wizard (3 steps):
   - **Step 1**: First name + date of birth (date picker)
   - **Step 2**: Birth time (time picker, "I don't know" option → sets `birth_time = NULL`)
   - **Step 3**: City of birth (autocomplete via Mapbox/Google Places → store lat/lng + timezone)
4. On submit:
   - Insert `profiles` row with birth data
   - Call `POST /api/birth-chart/compute` → runs Swiss Ephemeris server-side → upserts `birth_charts`
   - Set `onboarding_complete = true`
5. Redirect to `/today` — all content now personalized to user's sign

---

## Credits & Billing Architecture

**Credit bundles (example pricing):**
- 100 credits = $4.99
- 300 credits = $12.99 (best value)
- 600 credits = $22.99

**Advisor chat cost**: `advisor.rate_per_minute` credits/minute
(e.g., Luna Rose costs 4 credits/min = ~$0.20/min at 100 credits/$4.99)

**Session flow:**
1. User taps "Chat Now" → POST `/api/chat/{id}/session` (status: active, locks in `credits_per_minute`)
2. Frontend starts local timer, displays cost accumulating
3. Each message: POST to `/api/chat/{id}/messages` → Claude API generates advisor reply
4. User taps "End Session" → POST to close session → calculate `duration_seconds` → deduct credits → insert `credit_transactions` row
5. If credits run out mid-session: close session automatically, prompt to purchase more

**Subscription tiers:**
- **Free**: Access to Today page + Compatibility (limited to 1 sign pair/day) + no advisor chat
- **Premium ($9.99/mo)**: Full daily content + 50 free advisor credits/month + all features
- **Pro ($24.99/mo)**: Everything + 200 free advisor credits/month + priority advisor access

---

## Implementation Phases

### Phase 1 — Foundation (Week 1)
1. Install `@supabase/supabase-js @supabase/ssr`
2. Create Supabase project, run all migrations above
3. Create `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`
4. Create `src/middleware.ts` (auth guard + onboarding redirect)
5. Create `/login`, `/signup`, `/onboarding` pages
6. Seed static data: `compatibility_pairs`, `tarot_cards`, `magic_ball_answers`, `advisors`

### Phase 2 — User Profile & Birth Chart (Week 2)
1. Build onboarding wizard (3-step form)
2. Integrate Mapbox/Google Places for city autocomplete
3. Install `swisseph` npm package, write `src/lib/ephemeris/calculate-chart.ts`
4. `POST /api/birth-chart/compute` → real Swiss Ephemeris birth chart
5. `GET /api/birth-chart` → query from DB
6. Update `useBirthChart()` hook

### Phase 3 — Global Content APIs (Week 3)
1. Seed `interpretation_texts` (professional astrologer content)
2. Write cron Edge Function for daily ephemeris data (moon, transits, retrogrades)
3. Create all global content API routes (horoscope, moon, transits, daily-readings, compatibility)
4. Update all existing React Query hooks to use API routes instead of JSON
5. Integrate horoscope content API for daily sign readings

### Phase 4 — Real-time Advisor Chat (Week 4)
1. `GET/POST /api/chat/[advisorId]/messages` with Claude API integration
2. Supabase Realtime subscription in `useChatMessages()` hook
3. Session management API (start/end, credit deduction)
4. Credit balance display in header

### Phase 5 — Billing (Week 5)
1. Stripe integration: credit bundle purchase flow
2. Webhook handler: `POST /api/credits/webhook`
3. Subscription management (Premium/Pro tiers)
4. Credit transaction history page

### Phase 6 — Polish & Admin (Week 6)
1. Supabase Storage for user avatars
2. User settings page (notification preferences)
3. Saved readings feature
4. Admin seed scripts for `interpretation_texts` and ongoing content

---

## Critical Files to Create/Modify

**New:** `src/middleware.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/types.ts`, `src/lib/ephemeris/calculate-chart.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/onboarding/page.tsx`, all `src/app/api/*/route.ts` files

**Modified:** All 6 hook files in `src/hooks/` (swap JSON imports → API fetches), `src/components/layout/providers.tsx` (add auth context), `src/app/(dashboard)/layout.tsx` (pass user sign to children)

**Preserved as-is:** `src/lib/constants.ts` (all astrological constants stay static), `src/types/index.ts` (TypeScript interfaces remain valid), all component files (no UI changes in Phase 1-3)

---

## Verification

1. **Auth flow**: Sign up → verify email → onboarding → `/today` shows correct zodiac sign content
2. **Birth chart**: Check computed planets match [Astro.com](https://astro.com) for same birth data (within 1° orb)
3. **Daily content**: Confirm horoscope API returns 12 different readings; moon phase matches [timeanddate.com](https://timeanddate.com)
4. **Chat**: Send message → Claude responds in advisor persona → message persists in Supabase after refresh
5. **Credits**: Purchase bundle → Stripe webhook → balance updates → advisor chat deducts correctly
6. **RLS**: Confirm User A cannot query User B's birth chart or chat messages via direct Supabase client call
7. **Realtime**: Open two browser tabs → send message in one → appears instantly in other
