# Astroline Platform — Comprehensive Data & Architecture Audit


<!-- The plan file at C:\Users\dream\.claude\plans\mellow-dancing-wombat.md has the complete JSON request/response examples for every single feature. It is the full reference document. -->

> **Purpose**: Understand exactly how Astroline sources, generates, and serves every feature's data so we can make the right backend decisions for AstroAI.
> **Source**: HAR network captures of the live Astroline web app (5 sessions across all tabs).
> **Date of audit**: 2026-02-28

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Authentication Architecture](#2-authentication-architecture)
3. [Data Classification Matrix](#3-data-classification-matrix)
4. [Feature-by-Feature Deep Dive](#4-feature-by-feature-deep-dive)
   - 4.1 [Horoscope — Today Tab](#41-horoscope--today-tab)
   - 4.2 [Birth Chart](#42-birth-chart)
   - 4.3 [Transits](#43-transits)
   - 4.4 [Moon Calendar](#44-moon-calendar)
   - 4.5 [Compatibility](#45-compatibility)
   - 4.6 [Best Matches](#46-best-matches)
   - 4.7 [Palm Reading](#47-palm-reading)
   - 4.8 [Soulmate Sketch](#48-soulmate-sketch)
   - 4.9 [Advisors / AI Chat](#49-advisors--ai-chat)
   - 4.10 [Tarot](#410-tarot)
   - 4.11 [Astronomical Events & Retrogrades](#411-astronomical-events--retrogrades)
   - 4.12 [Biorhythms](#412-biorhythms)
   - 4.13 [Dating Calendar](#413-dating-calendar)
   - 4.14 [Lunar Calendar Wallpapers](#414-lunar-calendar-wallpapers)
   - 4.15 [Courses](#415-courses)
   - 4.16 [Tips](#416-tips)
5. [Analytics & Attribution Stack](#5-analytics--attribution-stack)
6. [Payment & Monetisation Stack](#6-payment--monetisation-stack)
7. [Astroline Tech Stack — Summary](#7-astroline-tech-stack--summary)
8. [AstroAI Decision Matrix — What to Replicate, How](#8-astroai-decision-matrix--what-to-replicate-how)
9. [Open Questions / Gaps](#9-open-questions--gaps)

---

## 1. Infrastructure Overview

Astroline operates **three distinct backend domains**, each with a separate role:

| Domain | Role | Notes |
|--------|------|-------|
| `astrology.astroline.app` | Main REST API — all content, user data, payments, chat | Laravel or similar PHP/Node monolith |
| `bcs-htz.astroline.app` | **Astrology calculation microservice** — birth charts, transits | Separate service, likely Python or Node with Swiss Ephemeris |
| `evtruck.magnus.ms` | Analytics / attribution event tracking | Magnus Mobile third-party SDK |

**Storage:**
- User uploads (palm photos, soulmate images): **Hetzner Object Storage** (`astroline.fsn1.your-objectstorage.com/uploads/`)
- Static assets (report icons, course images): **BunnyCDN** (`astroline.b-cdn.net`)

**Key architectural insight**: The hard astrology math is completely isolated in `bcs-htz`. The main API is just content serving and user management. This is the correct pattern — we should do the same.

---

## 2. Authentication Architecture

Astroline uses a **Firebase-bridged custom auth** flow:

```
Step 1: Device gets a device ID (idfm UUID) — anonymous identifier
Step 2: POST /api/v1/auth/firebase/create → sends {uid: idfm} → receives Firebase custom_token (JWT)
Step 3: Client signs in to Firebase with that custom_token (Google Identity Toolkit)
Step 4: Client gets a Firebase ID token → POST /api/v1/auth/firebase/auth → receives {profile, access_token}
Step 5: access_token used as Bearer token on all subsequent requests
```

**User profile returned on auth contains:**
```json
{
  "id": 371495410,
  "name": "You",
  "access_token": "VrXMRjpaVJaeILN1Cr_l7_zrjIo5HlQW",
  "device_id": "80cb6ec0-f885-11f0-8530-bdc4cb22a3e1",
  "gender": 0,
  "birthdate": "2000-01-01",
  "marital_status": 0,
  "birthtime": 1165,          ← minutes since midnight (19h 25m)
  "utc_offset": 5,
  "birth_place": "Bharuch, Gujarat, India",
  "lat": 21.7080427,
  "lon": 72.9956936,
  "lang": "en",
  "email": "darshanrana036@gmail.com"
}
```

**AstroAI equivalent**: Supabase Auth (email + Google OAuth) → `profiles` table with same birth data fields. Simpler — no Firebase bridge needed.

---

## 3. Data Classification Matrix

This is the core clarity you need for backend planning.

### 3A — Universal Data (identical for every user, every request)
> Compute or seed once. Cache aggressively. No personalization at all.

| Data | Source | Refresh Cycle |
|------|--------|---------------|
| Zodiac sign definitions / date ranges | `/api/v1/horoscope/all-signs` | Never (static) |
| Planet descriptions (what Sun/Moon/Mars means) | `/api/v1/birthchart/planets` | Never (static) |
| House descriptions (1st house, 2nd house…) | `/api/v1/birthchart/houses` | Never (static) |
| Aspect definitions (conjunction, trine, square…) | `/api/v1/birthchart/aspects` | Never (static) |
| Tarot card definitions | (inferred from history) | Never (static) |
| Astronomical events / retrogrades | `/api/v1/astronomical-events` | Monthly |
| Courses | `/api/v1/courses` | Occasional |
| Tips (love/work/warnings) | `/api/v1/tip` | Static pool |
| Magic ball answers | (from features) | Static pool |
| Lunar calendar wallpapers | `/api/v1/calendars` | Monthly |

### 3B — Sign-Specific Data (depends only on user's zodiac sign)
> 12 variants. Pre-compute for all 12 signs nightly. Same for every Capricorn, etc.

| Data | Source | Key Parameter |
|------|--------|---------------|
| Daily horoscope text | `/api/v1/horoscope?sign=capricorn` | sign |
| Moon calendar widget | `/api/v1/moon-calendar/widget?sign=cancer` | sign |
| Moon daily predictions | `/api/v1/moon-calendar/predictions?sign=cancer` | sign |
| Dating calendar (favorable dates) | `/api/v1/dating/calendar` | derived from sign |
| Dating predictions (date ideas) | `/api/v1/dating/predictions` | derived from sign |
| Best matches | `/api/v1/best-matches` | user's sign |
| Retrograde of the day | `/api/v1/astronomical-events/retrograde-of-the-day` | none (universal) |

### 3C — Pair-Specific Data (depends on exactly two signs)
> 144 combinations (12×12). Pre-compute all pairs. No real personalization.

| Data | Source | Key Parameters |
|------|--------|----------------|
| Compatibility overview + scores | `/api/v1/compatibility-v2?first_sign=capricorn&second_sign=aquarius` | sign1, sign2 |
| Soulmate category text | Within compatibility response | sign1, sign2 |

### 3D — Fully User-Specific Data (requires exact birth date + time + location)
> Must compute per user. Cannot be shared or cached across users. Swiss Ephemeris required.

| Data | Source | Inputs Required |
|------|--------|-----------------|
| Birth chart (planets, houses, aspects) | `POST https://bcs-htz.astroline.app/api/birthchart` | birth date, time, lat/lon |
| Personal transit calculations | `POST https://bcs-htz.astroline.app/api/transits` | birth date, time, lat/lon |
| Transit durations (start/end dates) | `POST https://bcs-htz.astroline.app/api/transit-duration` | natal + transiting planet positions |
| Personalized horoscope (AI-generated) | `POST /api/v1/horoscope/generate` | natal planet positions |
| Biorhythm readings | `/api/v1/biorhythms` | birth date (math-based cycles) |
| Palm reading results | `/api/v1/palm/view` | user's uploaded palm photo |
| Soulmate sketch image | `/api/v1/soulmate/view` | birth chart (derived signs) |
| Tarot history | `/api/v1/tarot/history` | user_id |
| Chat history | `/api/v1/astrology-questions/chats` | user_id |
| Credit balance | `/api/v1/astrology-questions/balance` | user_id |
| Subscription status | `/api/v1/payments/subscriptions` | user_id |

---

## 4. Feature-by-Feature Deep Dive

### 4.1 Horoscope — Today Tab

**Two completely different horoscope systems run in parallel:**

#### System 1 — Generic Sign Horoscope (sign-based, NOT personalized)
```
GET /api/v1/horoscope?horoscope_type=zodiac&sign=capricorn&early=false
```
Returns a list of readings by `time_type`: `before_yesterday`, `yesterday`, `today`, `tomorrow`.

Each reading has:
- `text` (HTML) — general narrative
- `quality` — "default" or other
- `tags[]` — per-category (love, career, health, money) with `percents` (0–100) and `text`

**This is the standard horoscope.** Every Capricorn gets the same text. Content is likely pre-written by human astrologers and stored in a database, refreshed daily or weekly.

**AstroAI equivalent**: `daily_horoscopes` table in Supabase. Source from a licensed horoscope content API (e.g., RapidAPI "Horoscope Astrology"), stored nightly by cron.

---

#### System 2 — Personalized Horoscope (natal-chart-based, AI-generated)
```
POST /api/v1/horoscope/generate
Body: {
  "enableHeader": true,
  "period": ["day"],
  "date": "2026-02-28",
  "pid": 2,
  "natalPlanets": [
    {"name":"sun","sign":"capricorn","house":6,"dms360":282.84},
    {"name":"moon","sign":"scorpio","house":4,"dms360":228.76},
    ...all planets...
  ]
}
```

Returns:
```json
[{
  "id": 45827021,
  "date": "2026-02-28",
  "period": "day",
  "data": {
    "powerAndFocus": "ambition, responsibility, growth",
    "troubles": "emotional tension, miscommunication, impatience",
    "header": "Navigating emotional energies",
    "blocks": [
      {"title": "Harness Your Ambition", "text": "As Mars aligns with your natal placement..."},
      ...
    ]
  }
}]
```

**This is the AI-personalized horoscope** — it takes your exact natal planet positions and generates a unique reading. The "powerAndFocus" and "troubles" fields map to the green Focus / red Troubles two-column layout visible in the UI.

**How it works**: The birth chart positions are sent to an LLM (likely GPT-4 or Claude) which generates narrative text referencing specific planetary aspects. This is what appears in the "AI Reading" section.

**AstroAI equivalent**: Use Claude API. Send the user's natal chart (from Swiss Ephemeris) + current transiting planets as context. Generate the daily personalized narrative. Cache result in `user_transit_readings` for the day so it's only generated once per user per day.

---

### 4.2 Birth Chart

**Calculation request:**
```
POST https://bcs-htz.astroline.app/api/birthchart
Body: {
  "birth": {
    "date": "2000-01-01",
    "time": "19:25",
    "location": {
      "name": "Bharuch, Gujarat, India",
      "lat": 21.7080427,
      "lon": 72.9956936
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "planetsWithSignsAndHouses": [
      {"name": "ascendant", "sign": "cancer", "house": 1},
      {"name": "sun", "sign": "capricorn", "house": 6},
      {"name": "moon", "sign": "scorpio", "house": 4},
      {"name": "mercury", "sign": "capricorn", "house": 6},
      {"name": "venus", "sign": "capricorn", "house": 6},
      {"name": "mars", "sign": "aquarius", "house": 8},
      ...
    ]
  }
}
```

**What `bcs-htz` is**: A Swiss Ephemeris-powered calculation microservice. It takes birth data → returns exact planetary positions in signs and houses. This is the gold standard for astrological accuracy (Astro.com uses Swiss Ephemeris too).

**Interpretation texts** (what each planet-in-sign means) come from a separate DB endpoint: `GET /api/v1/birthchart/planets` — these are long pre-written text descriptions, not computed.

**How the Big Three work**:
- Sun sign = always known from birth date alone
- Moon sign = requires birth date + time (changes sign every ~2.5 days)
- Rising/Ascendant = requires birth date + time + exact location (changes sign every ~2 hours)

**AstroAI equivalent**: Use the `swisseph` npm package. Run server-side in a Next.js API route or Supabase Edge Function. Store result in `birth_charts` table in Supabase. Calculation only runs once per user (unless they update birth data).

---

### 4.3 Transits

**Three separate transit API calls:**

#### A — Current Sky Positions (universal, same for everyone)
```
POST https://bcs-htz.astroline.app/api/transits
Body: { "birth": {...user birth data...} }
```
Returns current planetary positions in the sky today (where Sun, Moon, Mercury etc. are RIGHT NOW). Despite taking birth data, this actually returns current sky positions. The birth data is likely used to calculate local sidereal time.

#### B — Personal Transit Aspects (fully personalized)
```
POST https://bcs-htz.astroline.app/api/horoscopes-transits
Body: { "birth": {...} }
```
Returns which transiting planets are forming aspects to the user's NATAL planets, e.g.:
```json
{"natalPlanet":"jupiter","transitPlanet":"moon","aspect":"square","influence":"negative","start":"2026-02-27","end":"2026-02-28"}
```
This is unique per user. `transiting Sun square your natal Pluto` is specific to your birth chart.

#### C — Transit Text Library (universal lookup)
```
GET /api/v1/transits
```
Returns all ~200+ pre-written text interpretations keyed by `natal_planet × transit_planet × type (CONJUNCTION/TRINE/SQUARE etc.)`. This is a static reference database — the same text for everyone who has, say, "transiting Sun conjunct natal Moon."

**How they combine**: Calculate which transits are active for user (bcs-htz) → look up the matching interpretation text (v1/transits library) → display to user.

**Transit duration calculation:**
```
POST https://bcs-htz.astroline.app/api/transit-duration
Body: { "transit": { "transitPlanet": {...current position...}, "natalPlanet": {...birth position...} } }
```
Returns exact start/end dates for how long that transit is active.

**AstroAI equivalent**: Swiss Ephemeris handles all of A and B. Store pre-written interpretation texts in `interpretation_texts` Supabase table. Cache user's active transits daily in `user_transit_readings`.

---

### 4.4 Moon Calendar

**Two endpoints, both sign-parameterized:**

```
GET /api/v1/moon-calendar/widget?sign=cancer
```
Returns:
```json
{
  "moon_phase": "Waxing Gibbous",
  "sign": "cancer",
  "moon_phases_dates": [
    {"date": "2026-02-17", "phase": "new-moon"},
    {"date": "2026-02-24", "phase": "first-quarter"},
    ...
  ],
  "ritual": {
    "name": "Visit a hairdresser",
    "description": "Cutting your hair during the Waxing Moon helps it grow faster..."
  }
}
```

```
GET /api/v1/moon-calendar/predictions?sign=cancer
```
Returns daily entries with moon phase + ritual recommendations for the current month.

**Analysis**: Moon phase is astronomically calculated (Swiss Ephemeris can do this). The ritual text is sign-aware but also phase-aware — a pre-written lookup table of `moon_phase × zodiac_sign` combinations. Likely ~96 entries (8 phases × 12 signs).

**AstroAI equivalent**: Swiss Ephemeris calculates moon phase and sign daily. Rituals are pre-seeded content in Supabase, joined by `phase × sign` lookup.

---

### 4.5 Compatibility

```
GET /api/v1/compatibility-v2?first_sign=capricorn&second_sign=aquarius
```

Returns rich compatibility object:
- Sign metadata (element, modality, polarity, ruling planet)
- `overview` text
- Category scores: `love`, `marriage`, `friendship`, `sex`, `career`
- `strengths[]`, `challenges[]` arrays
- Long-form `description` text

**Analysis**: This is 100% pre-computed for all 144 sign pairs. There are no user-specific inputs beyond the two signs. Every Capricorn + Aquarius pair sees identical content. Content is human-written, stored in a database, and never changes.

**AstroAI equivalent**: `compatibility_pairs` table seeded once with 144 rows. All compatible with our existing `compatibility.json` mock data.

---

### 4.6 Best Matches

```
GET /api/v1/best-matches
```

Returns compatibility narrative for the user's sign across different relationship categories (friendship, romance, career). The server knows the user's sign from their profile and filters automatically. Content is pre-written, sign-specific.

**AstroAI equivalent**: Query `compatibility_pairs` where `sign1 = userSign`, return best matches sorted by `overall` score.

---

### 4.7 Palm Reading

**This is Astroline's most technically sophisticated feature.**

```
GET /api/v1/palm/view
```

Response:
```json
{
  "left": {
    "id": 5092306,
    "type": "left",
    "status": "full",
    "path": "https://astroline.fsn1.your-objectstorage.com/uploads/palm/2026-02-19/261b8083864ee6a4e941dfa6bd97a307.jfif",
    "result": {
      "core": {
        "lineScore": {
          "heart": 67,
          "life": 90,
          "head": 48,
          "fate": 86
        },
        "lineSuggestion": {
          "heart": "Your **Heart Line** reflects a strong emotional awareness...",
          "life": "Your **Life Line** shows impressively strong vitality...",
          "head": "Your **Head Line** suggests a practical and methodical thinker...",
          "fate": "Your **Fate Line** reveals a life guided by purpose..."
        }
      }
    }
  }
}
```

**What's happening here:**

1. **User uploads a palm photo** (stored as `.jfif` in Hetzner Object Storage under `/uploads/palm/date/`)
2. **Server-side computer vision processes the image** — detects and scores 4 palm lines (heart, life, head, fate) on a 0–100 scale
3. **AI generates personalized text** — each `lineSuggestion` is narrative text tailored to the user's specific scores
4. **Result is stored persistently** — `GET /api/v1/palm/view` returns cached results (the analysis only runs once per upload)

**What CV model/library does Astroline use?**

They do NOT expose this. It's black-boxed server-side. Based on industry analysis:
- Could be a **custom-trained CNN** (TensorFlow/PyTorch) specifically trained on palm images to detect dermatoglyphic lines
- Could be a third-party palmistry API (there are niche ones: Anaface, PalmistryHD API, etc.)
- Most likely: they use **OpenCV** for line detection (Canny edge detection + Hough line transform) combined with a **custom ML model** to classify which lines are which and score their depth/length
- The narrative text is almost certainly generated by an LLM (GPT-4/Claude) given the score values as input

**AstroAI options:**
| Option | Complexity | Cost | Quality |
|--------|-----------|------|---------|
| Build custom OpenCV + LLM pipeline | High | Low ongoing | High control |
| Third-party palmistry API (RapidAPI) | Low | Per-call | Variable |
| Use GPT-4 Vision / Claude vision to analyze palm photo directly | Medium | ~$0.01-0.05/analysis | Very good |
| Pre-built MediaPipe hand landmark detection + custom scoring | Medium | Free | Good |

**Recommended for AstroAI**: Use **Claude claude-opus-4-6 Vision API** — send the palm image, prompt it to identify and score the 4 major palm lines (heart, head, life, fate) and generate narrative. Store result in Supabase Storage (the photo) and a `palm_readings` table (the scores + text). Cost: ~$0.02 per analysis.

**The drawn lines UI**: The animated lines overlaid on the palm image in the Astroline UI are **SVG paths drawn client-side** based on generic palm anatomy — they are NOT actually tracing the user's individual lines. It's a decorative illustration.

---

### 4.8 Soulmate Sketch

```
GET /api/v1/soulmate/view
```

Response:
```json
{
  "id": 59615,
  "soulmate": "https://astroline.fsn1.your-objectstorage.com/uploads/soulmate_report/64c41ff9-3ac2-42e8-9f19-1601d023e5ae.jpg",
  "charts": {
    "your_chart": {
      "moon_sign": "aries",
      "sun_sign": "scorpio",
      "ascendant": "gemini"
    },
    "soulmate_chart": {
      "moon_sign": "leo",
      "sun_sign": "pisces",
      "ascendant": "libra"
    },
    "why_you_resonate": {
      "sun_text": "An unspoken emotional understanding...",
      "moon_text": "You find comfort in action and purpose..."
    }
  }
}
```

**What's happening here:**

1. **The "soulmate" is derived from astrology** — using the user's birth chart, an "ideal" complementary partner's signs are calculated (e.g., your Scorpio Sun pairs with Pisces; your Aries Moon pairs with Leo)
2. **The sketch image is AI-generated** — stored as a `.jpg` in `/uploads/soulmate_report/` — it's a portrait illustration
3. **The image is generated ONCE and cached** — it's not regenerated each session
4. **Text explanations** are personalized to the specific sign combinations

**How the sketch is generated (reverse-engineered):**
- Astroline likely uses **Stable Diffusion** or a similar image generation model with a prompt like:
  > *"Portrait sketch of a [gender] person with [physical traits based on Pisces rising/sun characteristics], pencil sketch style, romantic, astrological"*
- The traits (hair color, eye shape, face structure) are mapped from the "soulmate's" astrological signs to physical descriptors via a lookup table
- This is a **one-time generation per user** (pay once, unlock forever in premium)

**Key insight**: The "soulmate sketch" is marketing genius — it's not actually predicting a real person. It's generating an AI portrait based on the astrologically "compatible" sign archetypes. But it feels deeply personal.

**AstroAI equivalent**:
- Use our existing Supabase + Claude workflow
- Calculate the "ideal" partner's signs from user's birth chart
- Generate a portrait prompt: map each sign to physical characteristics (Pisces = soft features, blue/grey tones; Leo = strong jaw, warm coloring, etc.)
- Call **DALL-E 3** or **Stable Diffusion API** with the portrait prompt
- Store generated image in Supabase Storage
- Store interpretation text in a `soulmate_reports` table

---

### 4.9 Advisors / AI Chat

```
GET /api/v1/astrology-questions/chats       → list of chat threads
POST /api/v1/astrology-questions/start       → start a new chat session
GET /api/v1/astrology-questions/messages    → paginated message history
POST /api/v1/astrology-questions/create-question → send a question
POST /api/v1/astrology-questions/charge-time → debit credits per second
GET /api/v1/astrology-questions/balance     → credit balance
GET /api/v1/astrology-questions/suggests    → suggested question templates
```

**How the chat works:**

1. User picks an advisor (each has different personality/specialty)
2. `POST /start` begins a session — returns `{chat_id, is_unlimited}`
3. User sends a question via `create-question`
4. **The "advisor" responds** — in Astroline, this could be real humans (they have a marketplace model) OR AI-generated responses
5. Responses are **metered by time** — `charge-time` is called with `{seconds, chatId}` to debit credits
6. Unread messages are tracked: `is_viewed`, `is_blurred` (paywall on responses)
7. Advisors can offer "reports" (upsells) within chat

**Evidence from the HAR that it may be AI:**
- `/api/v1/astrology-questions/suggests` returns canned question templates — AI systems typically use these as conversation starters
- Response timing is instant in some cases (human astrologers don't respond in <1s)
- `charge-time` charges by the second, not by message — typical of AI cost models

**AstroAI approach**: All advisors are **Claude AI personas** (as already planned in SUPABASE_PLAN.md). Each advisor has a distinct `system_prompt`. User's birth chart is injected into the system context for every session.

---

### 4.10 Tarot

```
GET /api/v1/tarot/history
```
Returns:
```json
[
  {"id": 4659950, "date": "2026-02-27", "data": {"cardID": 92}, "user_id": 371495410},
  {"id": 4608415, "date": "2026-02-20", "data": {"cardID": 132}, "user_id": 371495410}
]
```

**Analysis**: One card per day, per user. Card is drawn server-side (random selection), stored permanently. Users cannot re-draw the same day's card. Card IDs reference a card definition table. The "daily tarot" is personal in that each user's daily draw is individual, but the card pool and definitions are universal (78 standard tarot cards).

**AstroAI equivalent**: `daily_readings` table with a `tarot_card_id` for today's universal card. Or give each user a personal draw stored in `user_saved_readings`.

---

### 4.11 Astronomical Events & Retrogrades

```
GET /api/v1/astronomical-events
GET /api/v1/astronomical-events/retrograde-of-the-day
```

Returns:
```json
{
  "id": 4,
  "planet": "mercury",
  "tags": ["Tech glitches", "Miscommunication", "Forgetfulness"],
  "description": "<p>Mercury rules communication...</p>",
  "expect": ["Misunderstandings and arguments", "Delays in travel..."],
  "start_date": "...",
  "end_date": "..."
}
```

**Analysis**: Universal data. Retrograde periods are astronomically predictable years in advance (Swiss Ephemeris can calculate them). The interpretation text is human-written. Astroline stores these as database records and serves them to all users. No personalization.

**AstroAI equivalent**: `planetary_retrogrades` table populated by cron job using Swiss Ephemeris, with pre-seeded interpretation texts.

---

### 4.12 Biorhythms

```
GET /api/v1/biorhythms
```

Returns text for 3 categories: `physical`, `intellectual`, `emotional`.

**Analysis**: Biorhythms are pure math — three sinusoidal cycles measured from birth date:
- Physical: 23-day cycle
- Emotional: 28-day cycle
- Intellectual: 33-day cycle

At any given date, each cycle is at a phase (0–100%). The text returned corresponds to phase ranges (e.g., "This is the hard time for you energetically wise" → physical cycle is in lower half).

Astroline has pre-written text for ~5 phase ranges × 3 categories = 15 text entries. They calculate user's current cycle position from birth date and return the matching text.

**AstroAI equivalent**: Pure calculation, no AI. Compute biorhythm phase from `profiles.birth_date` server-side. Map phase to text from a small lookup table in Supabase or as TypeScript constants.

---

### 4.13 Dating Calendar

```
GET /api/v1/dating/calendar           → month with favorable/unfavorable dates
GET /api/v1/dating/predictions        → daily date ideas + tips
```

**Analysis**: These are sign-personalized calendar features. Favorable dates are likely computed from lunar astrology (moon in user's sign, Venus aspects, etc.). The "date ideas" (go to an amusement park, ice skating) and "tips" (Believe in yourself, Be in the moment) appear to be from a curated pool.

**AstroAI approach**: Use moon phase + simple planetary aspect rules to calculate favorable/unfavorable dates. Store date idea pool in Supabase.

---

### 4.14 Lunar Calendar Wallpapers

```
GET /api/v1/calendars?year=2026&month=2&theme=DENIM
```

Returns a static image URL — a downloadable monthly lunar calendar with moon phase icons, styled by theme. Pure content, no personalization.

**AstroAI equivalent**: Generate these as static images, store in Supabase Storage, or skip entirely in v1.

---

### 4.15 Courses

```
GET /api/v1/courses
```

Returns structured courses with: name, description, image, `users_count`, `sessions_count`, `short_quiz_questions`. These are relationship/self-help courses with astrology framing. Pure content, no personalization.

**AstroAI decision**: Out of scope for v1.

---

### 4.16 Tips

```
GET /api/v1/tip
```

Returns 3–5 random tips per request from categories: `warnings`, `love`, `work`. Each tip has `likes` and `dislikes` counts (community voting). These are a static pool of ~300+ tips, randomly selected.

**AstroAI equivalent**: Seed a `tips` table in Supabase. Randomize on each page load.

---

## 5. Analytics & Attribution Stack

Astroline uses **Magnus Mobile** (`evtruck.magnus.ms`) for tracking:

```
POST /collector/user-property  → set user attributes (platform, device ID)
POST /collector/event          → fire analytics events (page views, button clicks, etc.)
GET /api/profile?idfm=...      → fetch user's acquisition attribution (which Facebook ad brought them)
```

The profile endpoint reveals their entire attribution data:
```json
{
  "utm_source": "Facebook_Web",
  "campaign_name": "{{campaign.name}}",  ← unresolved Fb template (bug in test account)
  "url": "https://sub.astroline.today/intro?creative_topic=moon"
}
```

**AstroAI equivalent**: Not needed for MVP. Use Vercel Analytics (built-in) or PostHog for product analytics later.

---

## 6. Payment & Monetisation Stack

| Component | Astroline | AstroAI |
|-----------|-----------|---------|
| Payment processor | **Solidgate** | **Stripe** (more developer-friendly, better docs) |
| Subscription management | Solidgate recurring | Stripe Subscriptions |
| One-time payments | Solidgate | Stripe Payment Intents |
| Credit system | Internal balance + `charge-time` API | Credits in Supabase `profiles.credits_balance` |
| Webhook | Solidgate → Astroline backend | Stripe → `POST /api/credits/webhook` |

Astroline's subscription data:
```json
{
  "active": 1,
  "product": "c9bcdea6-...",
  "expire_at": "2026-02-22 07:04:47",
  "currency": "USD",
  "amount": 39.99
}
```
They charge **$39.99/month** for premium. They also sell one-time reports (soulmate sketch, annual forecast PDF) for $9.99 each.

---

## 7. Astroline Tech Stack — Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React (likely Next.js), TypeScript |
| **Mobile** | React Native Web (evidence: `"platform":"rnw"` in chat API) |
| **Main backend** | Custom REST API — PHP Laravel or Node.js (likely Laravel given `.app` domain patterns) |
| **Astrology calculations** | Swiss Ephemeris — separate microservice at `bcs-htz.astroline.app` |
| **Auth** | Firebase Authentication (Google Identity Toolkit) with custom JWT bridge |
| **Database** | Unknown (MySQL/PostgreSQL — internal, no public clues) |
| **Object storage** | Hetzner Object Storage (EU-based, S3-compatible) |
| **CDN** | BunnyCDN for static assets |
| **Analytics** | Magnus Mobile SDK |
| **Payments** | Solidgate |
| **AI/LLM** | GPT-4 or Claude (for personalized horoscope generation, palm text) |
| **Image generation** | Stable Diffusion or DALL-E (for soulmate sketches) |
| **Computer vision** | Custom model or third-party API (for palm line detection + scoring) |
| **Real-time** | Unknown (possibly WebSockets or long-polling for chat events) |
| **Push notifications** | Firebase Cloud Messaging (implied by Firebase usage) |

---

## 8. AstroAI Decision Matrix — What to Replicate, How

| Feature | Astroline Approach | AstroAI Approach | Data Source |
|---------|-------------------|-----------------|-------------|
| **Auth** | Firebase → custom JWT | Supabase Auth (email + Google OAuth) | Supabase |
| **Birth chart** | Swiss Ephemeris microservice | `swisseph` npm in API route | User birth data → computed once |
| **Generic horoscope** | Human-written, stored in DB | Licensed horoscope content API → `daily_horoscopes` table | RapidAPI → Supabase, refreshed nightly |
| **Personalized horoscope** | LLM with natal planets | Claude API with natal chart context | Swiss Ephemeris → Claude API |
| **Transits** | Swiss Ephemeris + pre-written library | Swiss Ephemeris + `interpretation_texts` table | Computed + seeded DB |
| **Moon calendar** | Swiss Ephemeris + ritual lookup | Swiss Ephemeris + seeded ritual content | Computed + seeded DB |
| **Compatibility** | Pre-computed 144-pair DB | `compatibility_pairs` table (seed from mock data) | Static (seed once) |
| **Palm reading** | Unknown CV model → LLM for text | Claude Vision API → analyze photo → generate scores + text | User uploaded image |
| **Soulmate sketch** | AI image gen (Stable Diffusion/DALL-E) | DALL-E 3 via OpenAI API | Birth chart → sign archetypes → portrait prompt |
| **Advisors** | Likely AI + possibly some humans | Claude AI personas (system prompt per advisor) | Claude API + Supabase chat history |
| **Tarot** | Random draw, stored per user per day | Same — `tarot_cards` table, daily draw stored in `daily_readings` | Static card pool |
| **Retrogrades** | Pre-computed, stored in DB | Swiss Ephemeris cron → `planetary_retrogrades` | Computed + seeded |
| **Biorhythms** | Math from birth date → text lookup | Same — compute phase server-side, return text from constants | `profiles.birth_date` |
| **Payments** | Solidgate | Stripe | Stripe |
| **Real-time chat** | Unknown (WebSocket/polling) | Supabase Realtime (WebSocket built-in) | Supabase |
| **Storage** | Hetzner Object Storage | Supabase Storage | Supabase |
| **Deployment** | Unknown hosting | Vercel | Vercel |

---

## 9. Open Questions / Gaps

### 9.1 Palm Reading — CV Pipeline Detail
We cannot see what CV library Astroline uses internally. Our recommended approach (Claude Vision API) avoids this entirely. Cost estimate: ~$0.02–0.05 per palm reading analysis. For v1 this is acceptable. If volume grows, we can switch to a cached custom model.

### 9.2 Soulmate Sketch — Sign-to-Physical-Traits Mapping
We need to build or source a lookup table mapping zodiac signs to physical appearance descriptors for the image generation prompt. This is a creative/editorial task, not a technical one.

Example mapping:
```
Pisces sun → "dreamy eyes, soft features, gentle expression, ethereal quality"
Leo sun → "strong jaw, warm radiant smile, confident posture, regal bearing"
Scorpio ascendant → "intense dark eyes, magnetic presence, angular features"
```

This table needs to be written and stored in Supabase or as a TypeScript constant.

### 9.3 Horoscope Content API
We need to evaluate and choose a licensed horoscope content provider. Options:
- **RapidAPI "Horoscope Astrology"** — cheapest, basic
- **Astrology API (astrologiausapi.com)** — richer content
- **Write our own with Claude** — generate 12 sign readings nightly (cost: ~$0.10/day for all 12 signs), highest quality, fully branded
- **Hire a professional astrologer** to write a content bank — best quality, one-time cost

### 9.4 Interpretation Texts Database
The `interpretation_texts` table needs ~2,000–5,000 rows of professionally written astrological copy covering:
- 10 planets × 12 signs = 120 planet-in-sign interpretations
- 10 planets × 12 houses = 120 planet-in-house interpretations
- Major aspects between planet pairs = ~100–200 entries
- Transit texts (transiting planet × natal planet × aspect type) = ~500+ entries

This is the biggest content lift of the entire project. Options:
1. License content from an astrology content provider
2. Use AI (Claude) to generate — then have an astrologer review and edit
3. Start with a minimal set (just Big Three planets: Sun, Moon, Ascendant) and expand

### 9.5 WhatsApp Integration
Astroline has `GET /api/v1/whatsapp/account` returning a WhatsApp number. They use WhatsApp for customer support/advisor access. Out of scope for AstroAI v1.

### 9.6 Stories
The features tab fires `POST /api/v1/stories/view` — they have an Instagram-style "stories" feature for astrological daily content. Not in our current feature set.

---

*Audit complete. This document should be the reference point for all backend architecture decisions going forward.*
