# Astrology-API.io Live Audit and Backend Plan

## 1) Live audit summary (credit-safe)

Using your real API key, a controlled smoke run was executed.

- Total calls executed: `13`
- All returned: `HTTP 200`
- Quota header observed on every call: `x-remaining-quota`
- Quota moved from `6997` to `6984` during the run (13 credits consumed)

Validated endpoints:

- `GET /api/v3/data/now`
- `POST /api/v3/data/lunar-metrics`
- `POST /api/v3/lunar/events`
- `POST /api/v3/data/global-positions`
- `POST /api/v3/data/aspects`
- `POST /api/v3/charts/transit`
- `POST /api/v3/charts/natal`
- `POST /api/v3/charts/natal-transits`
- `POST /api/v3/analysis/compatibility-score`
- `POST /api/v3/numerology/core-numbers`
- `POST /api/v3/horoscope/sign/daily/text`
- `GET /api/v3/tarot/cards/daily`
- `POST /api/v3/tarot/cards/draw`

Result files:

- `docs/backend-plan/astrology_api_io-smoke-results.json`
- `docs/backend-plan/astrology_api_io-smoke-results-extra.json`

## 2) Alignment to current frontend requirements

### Strong fit (provider can supply recurring data)

- Today: sign horoscope text, moon metrics, lunar events, global positions/aspects
- Birth chart: natal chart + natal transits
- Compatibility: compatibility score endpoint
- Numerology: core numbers
- Tarot: daily card + draw/report primitives

### Partial fit (provider data exists, product logic still yours)

- Alternative horoscope categories (love/career/health/day) mapping to your FE taxonomy
- Retrograde explainability and event storytelling
- Daily “tip/do/don't/magic-ball” packaging
- Best matches/today's matches ranking models

### Not provider-owned (must stay internal)

- Advisors list/persona config/session history
- Story hub/categories/articles
- Interpretation rules/templates governance
- Soulmate sketch generation flow
- Past lives report logic

## 3) Seed data policy (what is one-time vs recurring)

One-time seed (initial load, then occasional edits):

- `advisors`
- tarot base glossary fallback (only if you want internal fallback)
- interpretation templates/rules
- story category skeleton

Recurring/provider-fed (cached refresh):

- horoscope sign daily text
- lunar metrics/events
- global positions/aspects/transits
- compatibility score
- numerology daily/profile responses
- tarot daily/draw outputs

## 4) Cost control plan for 7k credits/month

### Hard rules

- Do not call expensive endpoints in core flow (`palm`, `pdf`, `render`, `astrocartography`)
- Cache all Group A/common responses aggressively
- Serve frontend from Supabase cache, not from provider live calls

### Suggested TTL baseline

- Horoscope sign daily: 24h
- Moon metrics/events: 6-12h
- Global positions/aspects: 6h
- Compatibility sign pair: 30d (precompute matrix)
- Natal chart: until birth data changes
- Natal transits: 24h
- Numerology daily: 24h
- Tarot daily card: 24h
- Tarot draw (user draw): 24h lock per draw type

### Credit budgeting model

Monthly credits approx:

`DAU * avg_provider_calls_per_user_per_day * avg_credits_per_call * 30 + scheduled_common_refresh_calls`

Target for launch:

- Keep average provider calls under `0.15` per user/day by heavy caching and precompute.

## 5) Provider uncertainty (future provider switch)

Keep this contract no matter provider:

- frontend consumes only AstroAI DTO contracts
- provider response fields never go directly to frontend
- per provider adapter + mapper versions (`mapper_version`, `contract_version`)

Switch strategy:

1. Run new provider in shadow mode
2. Compare canonical output for key features
3. Flip per-feature routing in `provider_feature_map`
4. Keep rollback path by feature

## 6) Immediate backend implementation order

1. Build `provider-client` wrapper for validated endpoints only.
2. Map each endpoint output into canonical tables (`astro_core`, `astro_artifacts`).
3. Add cache-first service methods in `src/server/products/astroai`.
4. Wire API routes in order:
   - today
   - compatibility
   - birth chart
   - numerology/tarot
5. Keep all expensive endpoints disabled behind feature flags until business model is proven.

