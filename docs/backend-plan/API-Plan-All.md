API Plan - All Platform API Coverage Matrix
Status legend:

Yes = directly available from provider endpoint.
Partial = data exists in provider API, but AstroAI product logic/content/caching layer is still needed.
No = must be built in AstroAI backend.

**Group A - Common Data (shared content)**

| # | Feature | Tab | Unique per | Prokerala | AstrologyAPI | Astrology-API.io | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Daily Horoscope Text | Today | Zodiac sign | Yes | Yes | Yes | Prokerala `/horoscope/daily`; AstrologyAPI `/sun_sign_prediction/daily/:zodiacName`; Astrology-API.io `/api/v3/horoscope/sign/daily/text`. |
| 2 | Alt Horoscope (Love/Career/Health/Day) | Today | Zodiac sign | Yes | Partial | Partial | Prokerala has typed daily. Other providers can map categories, but exact FE taxonomy still needs mapping/content rules. |
| 3 | Moon Phase + Ritual | Today | Sign (for ritual) | Partial | Partial | Partial | Moon phase data exists in all three; ritual guidance is not directly provided. |
| 4 | Retrogrades + Astro Events | Today | Universal | Partial | Partial | Partial | Transit and lunar-event data exists (including retrograde-related fields), but event narrative/explainability is still custom. |
| 5 | Daily Readings (Tarot/Lucky No./Tip/Dos/Don'ts) | Today | Universal | No | Partial | Partial | Astrology providers offer tarot/numerology signals; your tip/do/don't rotation content layer remains backend-owned. |
| 6a | World Transits / Event of Day | Today | Universal | Partial | Partial | Partial | Global/transit endpoints exist across providers; event-of-day significance and editorial copy are custom. |
| 8 | Advisor Cards List | Advisors | Universal | No | No | No | AstroAI-owned advisors table. |
| 14 | Magic Ball answer pool | Features | Universal | No | No | No | In-house seeded pool and selection logic. |
| 15 | Yes or No logic | Features | Universal | No | Partial | Partial | AstrologyAPI has `/yes_no_tarot`; Astrology-API.io can derive from tarot draw/interpretation endpoints, but final logic is yours. |
| 16 | Stories (all 16 categories) | Features | Universal | No | No | No | In-house editorial content/CMS. |
| 17 | Compatibility Scores | Compatibility | Sign pair (144 combos) | Partial | Yes | Yes | AstrologyAPI and Astrology-API.io both provide direct compatibility score/report stacks; custom weighting/UI payload still optional. |
| 18 | Best Matches Carousel | Compatibility | Zodiac sign | No | Partial | Partial | Derive from precomputed sign-pair compatibility rankings in Supabase. |
| 19 | Today's Matches | Compatibility | Sign + date | Partial | Partial | Partial | Compatibility/timing data exists; daily multi-category matchmaking model remains custom. |
| 26 | Horoscope System Variants (Western/Vedic/Indian Lunar/Indian Solar/Mayan/Chinese/Druid) | Today | System + sign/date/year | Partial | Partial | Partial | Western and Vedic are supported; Chinese is available in astrology providers; Mayan/Druid are not currently covered in these provider plans. |

**Group B - Personalized Data (user-specific)**

| # | Feature | Tab | What makes it unique | Prokerala | AstrologyAPI | Astrology-API.io | Notes |
|---|---|---|---|---|---|---|---|
| 6b | Personal Transits | Today | User natal chart positions | Yes | Yes | Yes | Supported in all three via natal/transit chart and report endpoints. |
| 7 | Biorhythms | Today | Exact birth date | No | Yes | Yes | AstrologyAPI has `/biorhythm`; Astrology-API.io has `/api/v3/insights/wellness/biorhythms`. |
| 9 | Recent Chats | Advisors | User account history | No | No | No | AstroAI-owned chat sessions/messages. |
| 10 | Chat Interface | Advisors | Birth-chart context + private history | No | No | No | OpenAI plus your own session, credits, and prompt orchestration backend. |
| 11 | Palm Reading | Features | Uploaded palm photo | No | No | Yes | Astrology-API.io includes native palmistry endpoints with image URL/base64 input. |
| 12 | Soulmate Sketch | Features | Chart-derived match profile | No | No | No | OpenAI image generation plus your chart-to-prompt logic. |
| 13 | Tarot Daily Draw | Features | User draw state/history | No | Partial | Partial | Tarot content is available from both astrology providers, but draw history/anti-redraw enforcement remains custom. |
| 20 | Big Three (Sun/Moon/Rising) | Birth Chart | Birth date + time + location | Yes | Yes | Yes | Supported via positions + houses endpoints in all providers. |
| 21 | Planets Table | Birth Chart | User planetary positions | Yes | Yes | Yes | All three providers expose planetary position datasets. |
| 22 | Houses Table | Birth Chart | User birth time + location | Yes | Yes | Yes | All three providers expose house cusp/house placement datasets. |
| 23 | Aspects Table | Birth Chart | Natal planet angles | Yes | Yes | Yes | All three providers expose aspect datasets. |
| 24 | Stellar Composition | Birth Chart | Derived from natal placements | Partial | Partial | Partial | Derivable from natal placements in all providers, but not a direct out-of-box field. |
| 25 | Daily Transits (birth chart tab) | Birth Chart | Current sky vs natal chart | Yes | Yes | Yes | Supported by transit + natal comparison endpoints across providers. |
| 27 | Astrocartography / Relocation Lines | Features | Birth data + relocation place | No | No | Yes | Native in Astrology-API.io via astrocartography endpoints; no direct equivalent in current Prokerala/AstrologyAPI plan docs. |
| 28 | Past Lives Report | Features | Birth data + interpretation model | No | No | No | No direct endpoint in current provider plans; custom content/logic layer required. |
| 29 | Numerology Profile + Daily Number | Features | Name + birth date (+ date) | Yes | Yes | Yes | Prokerala, AstrologyAPI, and Astrology-API.io all expose numerology capabilities. |

### Notes for Production Use
Treat provider APIs as calculation/content sources, and Supabase as your canonical app-serving database.
Cache all Group A data on schedule; do not fetch it per user request.
For Group B, avoid expensive per-user daily provider calls when deterministic local engines can be used.
For compatibility-heavy UX, precompute sign-pair matrices and store in Supabase to cut runtime API spend.
Treat `https://api.astrology-api.io/api/v3/openapi.json` as source of truth for Astrology-API.io; the exported Postman collection may lag live operations.
