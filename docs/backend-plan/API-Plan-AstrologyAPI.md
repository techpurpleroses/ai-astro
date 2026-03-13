# API Plan - AstrologyAPI Coverage Matrix

Research snapshot date: 2026-03-09

Status legend:
- `Yes` = directly available from AstrologyAPI endpoint.
- `Partial` = data exists, but AstroAI product logic/content/state layer is still needed.
- `No` = must be built in AstroAI backend.

## Group A - Common Data (shared content)

| # | Feature | Tab | Unique per | AstrologyAPI | Notes |
|---|---|---|---|---|---|
| 1 | Daily Horoscope Text | Today | Zodiac sign | Yes | `/sun_sign_prediction/daily/:zodiacName` |
| 2 | Alt Horoscope (Love/Career/Health/Day) | Today | Zodiac sign | Partial | Daily API gives `personal_life`, `profession`, `health`; consolidated daily gives single summary. Mapping to exact FE taxonomy is needed. |
| 3 | Moon Phase + Ritual | Today | Sign (for ritual) | Partial | `/lunar_metrics` and `/moon_phase_report` provide moon data and report text; ritual content is not provided. |
| 4 | Retrogrades + Astro Events | Today | Universal | Partial | `/tropical_transits/daily` includes `retrogrades`, transit-house and transit-relation data; event editorial layer is custom. |
| 5 | Daily Readings (Tarot/Lucky No./Tip/Dos/Don'ts) | Today | Universal | Partial | `/tarot_predictions`, `/numerological_numbers`, `/personal_day_prediction` can seed content, but tip/do/don't and rotation strategy are custom. |
| 6a | World Transits / Event of Day | Today | Universal | Partial | `/tropical_transits/daily`, `/tropical_transits/weekly`, `/tropical_transits/monthly` + `/life_forecast_report/tropical`; event-of-day significance and messaging are your backend responsibility. |
| 8 | Advisor Cards List | Advisors | Universal | No | AstroAI-owned advisors CMS/table. |
| 14 | Magic Ball answer pool | Features | Universal | No | Build in-house answer pools and weighted picker. |
| 15 | Yes or No logic | Features | Universal | Partial | `/yes_no_tarot` provides answer payload, but your app logic/guardrails are still required. |
| 16 | Stories (all 16 categories) | Features | Universal | No | In-house editorial content/CMS. |
| 17 | Compatibility Scores | Compatibility | Sign pair (144 combos) | Yes | `/zodiac_compatibility/:zodiacName/:partnerZodiacName` and `/compatibility/:sunSign/:risingSign/:partnerSunSign/:partnerRisingSign` return compatibility scores + report text. |
| 18 | Best Matches Carousel | Compatibility | Zodiac sign | Partial | Derive by batch-evaluating sign pairs and ranking in Supabase. |
| 19 | Today's Matches | Compatibility | Sign + date | Partial | Compatibility reports exist, but your final daily match list/scoring (love, friend, vibe, timing) is product-specific. |
| 26 | Horoscope System Variants (Western/Vedic/Indian Lunar/Indian Solar/Mayan/Chinese/Druid) | Today | System + sign/date/year | Partial | Western + Chinese are native in docs; Indian stack exists in core API docs; Mayan/Druid are not covered. |

## Group B - Personalized Data (user-specific)

| # | Feature | Tab | What makes it unique | AstrologyAPI | Notes |
|---|---|---|---|---|---|
| 6b | Personal Transits | Today | User natal chart positions | Yes | `/natal_transits/daily`, `/natal_transits/weekly` |
| 7 | Biorhythms | Today | Exact birth date | Yes | `/biorhythm` (available in AstrologyAPI docs API set). |
| 9 | Recent Chats | Advisors | User account history | No | AstroAI-owned chat sessions/messages. |
| 10 | Chat Interface | Advisors | Birth-chart context + private history | No | OpenAI + your own orchestration/session stack. |
| 11 | Palm Reading | Features | Uploaded palm photo | No | Roboflow + your media pipeline/storage/history APIs. |
| 12 | Soulmate Sketch | Features | Chart-derived match profile | No | OpenAI image generation + your chart-to-prompt logic. |
| 13 | Tarot Daily Draw | Features | User draw state/history | Partial | Tarot endpoints provide content, but user draw lock/history and anti-redraw controls are custom. |
| 20 | Big Three (Sun/Moon/Rising) | Birth Chart | Birth date + time + location | Yes | `/planets/tropical` + `/house_cusps/tropical` (ascendant) |
| 21 | Planets Table | Birth Chart | User planetary positions | Yes | `/planets/tropical` or `/western_horoscope` |
| 22 | Houses Table | Birth Chart | User birth time + location | Yes | `/house_cusps/tropical`, `/western_horoscope` |
| 23 | Aspects Table | Birth Chart | Natal planet angles | Yes | `/western_chart_data`, `/western_horoscope` include aspects. |
| 24 | Stellar Composition | Birth Chart | Derived from natal placements | Partial | Derivable from planets/houses/aspects, not a direct endpoint field. |
| 25 | Daily Transits (birth chart tab) | Birth Chart | Current sky vs natal chart | Yes | Combine `/tropical_transits/*` + `/natal_transits/*`. |
| 27 | Astrocartography / Relocation Lines | Features | Birth data + relocation place | No | No direct astrocartography endpoint in current AstrologyAPI plan docs. |
| 28 | Past Lives Report | Features | Birth data + interpretation model | No | No direct past-lives endpoint in current AstrologyAPI plan docs. |
| 29 | Numerology Profile + Daily Number | Features | Name + birth date (+ date) | Yes | Numerology endpoints are available (`numerological_numbers`, `lifepath_number`, `personal_day_prediction`, etc.). |

## Priority Fit (Western SaaS)

- Compatibility (highest): **Strong fit**. AstrologyAPI has direct scoring endpoints and long-form compatibility reports.
- Moon Phase (daily habit loop): **Strong fit**. `lunar_metrics` and `moon_phase_report` can power daily moon cards and alerts.
- Retrograde/Events (timing context): **Moderate fit**. Retrograde flags are available; event narrative and explainability layer should be built in AstroAI CMS/backend.

## Key Gaps You Must Build

- Editorial content engines: stories, ritual text, tips, dos/don'ts, event narrative.
- App state and personalization: draw history, chat memory, user feed ordering, advisor marketplace logic.
- Product scoring layer: final compatibility rankings, today's matches logic, conversion-oriented packaging.

## Official Endpoint References

- Western docs: `https://www.astrologyapi.com/western-api-docs`
- Horoscope docs: `https://www.astrologyapi.com/horoscope-api-docs`
- Core docs index (includes non-western endpoints like `biorhythm`): `https://www.astrologyapi.com/docs`

## Monthly Cost Estimate (1,000 DAU)

Assumptions:
- `1,000` DAU ~= `30,000` user-days/month.
- Using the same traffic-volume scenarios as your Prokerala model for apples-to-apples comparison.
- AstrologyAPI pricing snapshot date: `2026-03-09` (monthly billing):
  - Starter: `INR 2,999` with `50,000` requests/month.
  - Growth: `INR 4,999` with `300,000` requests/month.
  - Business: `INR 14,999` with `1,000,000` requests/month.
  - Overage: `INR 20` per `1,000` API calls after plan limits.
- Non-astrology stack subtotal reused from your earlier model (Supabase + OpenAI + Roboflow): `INR 24,881` / month (ex GST).

### AstrologyAPI Request Scenarios

| Scenario | Estimated Requests / Month | Cheapest Plan Outcome | AstrologyAPI Cost (INR, ex GST) |
|---|---:|---|---:|
| A - Optimized (recommended) | 1,057,000 | Business + overage on 57,000 | 16,139 |
| B - Heavy personalized | 5,557,000 | Business + overage on 4,557,000 | 106,139 |
| C - Worst case | 16,057,000 | Business + overage on 15,057,000 | 316,139 |

### Estimated Total Platform Cost (AstrologyAPI + rest of stack)

| Scenario | Total (INR, ex GST) | Total (INR, +18% GST approx) |
|---|---:|---:|
| A - Optimized (recommended) | 41,020 | 48,404 |
| B - Heavy personalized | 131,020 | 154,604 |
| C - Worst case | 341,020 | 402,404 |

### Plan Thresholds (Useful Shortcut)

- Up to ~`150,000` requests/month: Starter can remain cheaper than Growth with overage.
- Around `150,000` to `800,000`: Growth is usually cheapest.
- Above ~`800,000`: Business usually becomes cheapest.

### Pricing Sources

- Western pricing page: `https://www.astrologyapi.com/pricing/western-astrology-pricing`
- Horoscope pricing page (overage note visible): `https://www.astrologyapi.com/pricing/horoscopes-pricing`
