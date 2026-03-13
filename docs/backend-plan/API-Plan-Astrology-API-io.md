# API Plan - Astrology-API.io Coverage Matrix

Research snapshot date: 2026-03-09

Status legend:
- `Yes` = directly available from Astrology-API.io endpoint.
- `Partial` = data exists, but AstroAI product logic/content/state layer is still needed.
- `No` = must be built in AstroAI backend.

## Group A - Common Data (shared content)

| # | Feature | Tab | Unique per | Astrology-API.io | Notes |
|---|---|---|---|---|---|
| 1 | Daily Horoscope Text | Today | Zodiac sign | Yes | `/api/v3/horoscope/sign/daily/text` |
| 2 | Alt Horoscope (Love/Career/Health/Day) | Today | Zodiac sign | Partial | Has sign/personal text horoscope and separate analysis endpoints (`/analysis/career`, `/analysis/health`, `/analysis/relationship`), but exact FE category mapping is custom. |
| 3 | Moon Phase + Ritual | Today | Sign (for ritual) | Partial | `/api/v3/data/lunar-metrics`, `/api/v3/lunar/phases`, `/api/v3/lunar/events`; ritual content is not provided directly. |
| 4 | Retrogrades + Astro Events | Today | Universal | Partial | Transit and lunar-event endpoints exist; event narrative/explainability layer is still custom. |
| 5 | Daily Readings (Tarot/Lucky No./Tip/Dos/Don'ts) | Today | Universal | Partial | Tarot and numerology endpoints exist, but tip/do/don't pools and rotation logic are custom. |
| 6a | World Transits / Event of Day | Today | Universal | Partial | `/api/v3/data/global-positions` and transit/report endpoints can power this; event-of-day significance text is your layer. |
| 8 | Advisor Cards List | Advisors | Universal | No | AstroAI-owned advisors CMS/table. |
| 14 | Magic Ball answer pool | Features | Universal | No | Build in-house answer pools and weighted picker. |
| 15 | Yes or No logic | Features | Universal | Partial | No dedicated magic-ball/yes-no endpoint, but tarot draw/report endpoints can be adapted. |
| 16 | Stories (all 16 categories) | Features | Universal | No | In-house editorial content/CMS. |
| 17 | Compatibility Scores | Compatibility | Sign pair (144 combos) | Yes | `/api/v3/analysis/compatibility-score`, `/api/v3/analysis/compatibility`, plus synastry/composite stacks. |
| 18 | Best Matches Carousel | Compatibility | Zodiac sign | Partial | Derive by precomputing sign-pair scores/ranks and storing in Supabase. |
| 19 | Today's Matches | Compatibility | Sign + date | Partial | Relationship/compatibility/timing endpoints exist, but final daily matchmaking logic remains product-specific. |
| 26 | Horoscope System Variants (Western/Vedic/Indian Lunar/Indian Solar/Mayan/Chinese/Druid) | Today | System + sign/date/year | Partial | Western, Vedic, and Chinese stacks exist. Mayan and Druid are not currently covered in documented endpoints. |

## Group B - Personalized Data (user-specific)

| # | Feature | Tab | What makes it unique | Astrology-API.io | Notes |
|---|---|---|---|---|---|
| 6b | Personal Transits | Today | User natal chart positions | Yes | `/api/v3/charts/natal-transits`, `/api/v3/analysis/transit-report` and related transit endpoints. |
| 7 | Biorhythms | Today | Exact birth date | Yes | `/api/v3/insights/wellness/biorhythms` |
| 9 | Recent Chats | Advisors | User account history | No | AstroAI-owned chat sessions/messages. |
| 10 | Chat Interface | Advisors | Birth-chart context + private history | No | OpenAI + your own orchestration/session stack. |
| 11 | Palm Reading | Features | Uploaded palm photo | Yes | Native palmistry endpoints: `/api/v3/palmistry/reading`, `/analysis`, `/astro`, `/compatibility`. |
| 12 | Soulmate Sketch | Features | Chart-derived match profile | No | No native soulmate sketch image generation endpoint found. |
| 13 | Tarot Daily Draw | Features | User draw state/history | Partial | `/api/v3/tarot/cards/daily`, `/api/v3/tarot/cards/draw` exist, but draw state/history and anti-redraw controls are custom. |
| 20 | Big Three (Sun/Moon/Rising) | Birth Chart | Birth date + time + location | Yes | Positions + houses endpoints support sun/moon/rising derivation. |
| 21 | Planets Table | Birth Chart | User planetary positions | Yes | `/api/v3/data/positions` |
| 22 | Houses Table | Birth Chart | User birth time + location | Yes | `/api/v3/data/house-cusps` |
| 23 | Aspects Table | Birth Chart | Natal planet angles | Yes | `/api/v3/data/aspects` |
| 24 | Stellar Composition | Birth Chart | Derived from natal placements | Partial | Derivable from planets/houses/aspects, not a direct endpoint field. |
| 25 | Daily Transits (birth chart tab) | Birth Chart | Current sky vs natal chart | Yes | Supported by transit chart and transit report endpoints. |
| 27 | Astrocartography / Relocation Lines | Features | Birth data + relocation place | Yes | Astrocartography and relocation endpoints are part of the v3 API set. |
| 28 | Past Lives Report | Features | Birth data + interpretation model | No | No dedicated past-lives endpoint in the current v3 OpenAPI set. |
| 29 | Numerology Profile + Daily Number | Features | Name + birth date (+ date) | Yes | Numerology endpoint suite is available in v3 (`core-numbers`, `comprehensive`, compatibility, and related flows). |

## Priority Fit (Western SaaS)

- Compatibility (highest): **Strong fit**. Direct score and report endpoints, plus synastry/composite chart/report APIs.
- Moon Phase (daily habit loop): **Strong fit**. Lunar metrics, phases, events, and void-of-course style endpoints are present.
- Retrograde/events (timing context): **Moderate to strong fit**. Transit stack is broad, but product-ready event narrative and "why now" copy remain custom.

## API/Access Reality Check

- OpenAPI source of truth: `https://api.astrology-api.io/api/v3/openapi.json`
- OpenAPI version observed: `3.2.10`
- Operations observed: `249`
- Auth model: all operations require bearer API key (`Authorization: Bearer <key>`).
- Direct no-auth endpoint calls return HTTP `401`.

## Postman Collection Audit (Your Downloaded File)

Analyzed file: `C:\Users\dream\Downloads\best-astrology-api-postman.json`

- Collection version: `v3.2.0` (generated `2026-01-08`)
- Request count in file: `505`
- Unique method+path endpoints in file: `212`
- Compared to live OpenAPI (`249` operations), the collection is behind and not full coverage.
- `baseUrl` variable in the file is set to localhost (`http://127.0.0.1:8000`), not production default.
- No collection-level auth preset is included; bearer token setup must be added manually.

## Known Gaps You Still Must Build

- Advisor marketplace layer, chats/history, personalization feeds, user state.
- Story engine, ritual content, tip/do/don't editorial pipeline.
- Yes/no/magic-ball product logic and weighting model.
- Soulmate sketch generation layer.
- Billing/subscription/credits system (your Stripe stack).

## Official References

- Main site: `https://astrology-api.io/`
- Pricing: `https://astrology-api.io/pricing`
- API docs UI: `https://api.astrology-api.io/docs`
- OpenAPI JSON: `https://api.astrology-api.io/api/v3/openapi.json`
