# API Plan - Prokerala Coverage Matrix

Status legend:
- `Yes` = directly available from Prokerala API.
- `Partial` = can be derived from Prokerala data, but product logic/content layer is still needed.
- `No` = must be built in AstroAI backend.

## Group A - Common Data (shared content)

| # | Feature | Tab | Unique per | Prokerala | Notes |
|---|---|---|---|---|---|
| 1 | Daily Horoscope Text | Today | Zodiac sign | Yes | `/horoscope/daily`, `/horoscope/daily/advanced` |
| 2 | Alt Horoscope (Love/Career/Health/Day) | Today | Zodiac sign | Yes | `/horoscope/daily/advanced?type=` |
| 3 | Moon Phase + Ritual | Today | Sign (for ritual) | Partial | Moon/astro data can be derived; ritual content not provided directly. |
| 4 | Retrogrades + Astro Events | Today | Universal | Partial | Retrograde flags exist in transit data, but full event feed and product narrative needs your layer. |
| 5 | Daily Readings (Tarot/Lucky No./Tip/Dos/Don'ts) | Today | Universal | No | Build in-house rotation engine and content pools. |
| 6a | World Transits / Event of Day | Today | Universal | Partial | Transit data available; event-of-day significance and editorial text required in your backend. |
| 8 | Advisor Cards List | Advisors | Universal | No | AstroAI-owned advisors table. |
| 14 | Magic Ball answer pool | Features | Universal | No | In-house seeded pool and selection logic. |
| 15 | Yes or No logic | Features | Universal | No | In-house deterministic or weighted engine. |
| 16 | Stories (all 16 categories) | Features | Universal | No | In-house editorial content/CMS. |
| 17 | Compatibility Scores | Compatibility | Sign pair (144 combos) | Partial | Compatibility endpoints exist, but not your full custom score model and UI payload. |
| 18 | Best Matches Carousel | Compatibility | Zodiac sign | No | Derive from your compatibility model and ranking logic. |
| 19 | Today's Matches | Compatibility | Sign + date | Partial | Love compatibility combos can be derived; full multi-category daily model is custom. |
| 26 | Horoscope System Variants (Western/Vedic/Indian Lunar/Indian Solar/Mayan/Chinese/Druid) | Today | System + sign/date/year | Partial | Western and Vedic stacks are present; Indian calendar support exists via Panchang-type data; Mayan/Druid are not covered in current plan docs. |

## Group B - Personalized Data (user-specific)

| # | Feature | Tab | What makes it unique | Prokerala | Notes |
|---|---|---|---|---|---|
| 6b | Personal Transits | Today | User natal chart positions | Yes | `/astrology/transit-planet-position`, transit chart/aspect endpoints. |
| 7 | Biorhythms | Today | Exact birth date | No | Build with formula engine from birth date. |
| 9 | Recent Chats | Advisors | User account history | No | AstroAI-owned chat sessions/messages. |
| 10 | Chat Interface | Advisors | Birth-chart context + private history | No | OpenAI plus your own session, credits, and prompt orchestration backend. |
| 11 | Palm Reading | Features | Uploaded palm photo | No | Roboflow plus your own storage, scoring, and history APIs. |
| 12 | Soulmate Sketch | Features | Chart-derived match profile | No | OpenAI image generation plus your chart-to-prompt logic. |
| 13 | Tarot Daily Draw | Features | User draw state/history | No | In-house tarot draw/history and anti-redraw logic. |
| 20 | Big Three (Sun/Moon/Rising) | Birth Chart | Birth date + time + location | Yes | Derived from natal planet and angle data. |
| 21 | Planets Table | Birth Chart | User planetary positions | Yes | `/astrology/natal-planet-position` |
| 22 | Houses Table | Birth Chart | User birth time + location | Yes | Included in natal/transit planet position responses. |
| 23 | Aspects Table | Birth Chart | Natal planet angles | Yes | Included in western position/aspect responses. |
| 24 | Stellar Composition | Birth Chart | Derived from natal placements | Partial | Derivable from natal data; not a direct Prokerala output field. |
| 25 | Daily Transits (birth chart tab) | Birth Chart | Current sky vs natal chart | Yes | Transit plus natal aspect endpoints support this. |
| 27 | Astrocartography / Relocation Lines | Features | Birth data + relocation place | No | No direct astrocartography endpoint in current Prokerala plan docs. |
| 28 | Past Lives Report | Features | Birth data + interpretation model | No | No direct past-lives endpoint in current Prokerala plan docs. |
| 29 | Numerology Profile + Daily Number | Features | Name + birth date (+ date) | Yes | Prokerala includes numerology calculators/prediction capabilities in its API suite. |

## Notes for Production Use

- Treat Prokerala as a calculation/content source, and Supabase as your canonical app-serving database.
- Cache all Group A data on schedule; do not fetch it per user request.
- For Group B, avoid expensive per-user daily provider calls when deterministic local engines can be used (especially transits).

## Monthly Cost Estimate (1,000 DAU)

Assumptions:
- `1,000` DAU ~= `30,000` user-days/month.
- FX used for USD services: `1 USD = INR 91.81` (snapshot on `2026-03-07`).
- Prokerala pricing used: `INR 4,999` for first `1,000,000` credits, then `INR 2,500` per extra `100,000` credits.
- OpenAI advisor usage assumption: `35%` DAU use chat daily, `4` turns/day, avg `1,000` input + `1,000` output tokens/turn using GPT-4.1 mini.
- OpenAI Soulmatch assumption: `5%` DAU generate `1` image/day with GPT Image 1 `medium` (`1024x1024`) quality.
- Roboflow Palm assumption: usage stays within Core plan bundled credits for this scale.

### Prokerala Credit Scenarios

| Scenario | Credit Model | Estimated Credits / Month | Prokerala Cost (INR, ex GST) |
|---|---|---:|---:|
| A - Optimized (recommended) | Group A cached daily + compatibility matrix + onboarding natal calls only | 1,057,000 | 7,499 |
| B - Heavy personalized | Scenario A + personal transit API for `30%` DAU daily | 5,557,000 | 119,999 |
| C - Worst case | Scenario A + personal transit API for `100%` DAU daily | 16,057,000 | 382,499 |

### Total Platform Cost (Monthly)

| Cost Head | Formula | Amount (INR, ex GST) |
|---|---|---:|
| Supabase | Pro plan (`$25`) x `91.81` | 2,295 |
| Roboflow | Core plan (`$99`) x `91.81` | 9,089 |
| OpenAI Advisor Text | Estimated `$84` x `91.81` | 7,712 |
| OpenAI Soulmatch Image | Estimated `$63` x `91.81` | 5,784 |
| **Subtotal (without Prokerala)** |  | **24,881** |

### Estimated Total by Scenario

| Scenario | Total (INR, ex GST) | Total (INR, +18% GST approx) |
|---|---:|---:|
| A - Optimized (recommended) | 32,380 | 38,208 |
| B - Heavy personalized | 144,880 | 170,958 |
| C - Worst case | 407,380 | 480,708 |

### Stripe (Payment Processing) Note

- Stripe India card pricing baseline is around `2%` (domestic cards) and `3%` (international cards), plus applicable taxes.
- Practical estimator for domestic card volume: `Stripe fee ~= GMV x 2.36%` (2% + 18% GST on fee).
- Example: if monthly GMV is `INR 5,00,000`, domestic Stripe fees are about `INR 11,800` (`5,00,000 x 2.36%`).
