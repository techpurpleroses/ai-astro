# Astrology-API.io Credit Budget Policy (7,000/month)

## Live confirmation from your Usage page

- Billing period: `Mar 12, 2026 -> Apr 12, 2026`
- Quota: `7,000`
- Requests used: `16`
- Credits used: `16`
- Endpoint class seen: `Standard Endpoints`
- Effective cost observed: `1 credit per request` (for tested endpoints)

## Core constraint

With 7,000 credits/month, max average is:

- `~226 credits/day` (`7000 / 31`)

This is the hard system budget. Any design that makes per-user daily provider calls at scale will fail quickly.

## Production budget split

Use this monthly allocation:

1. Common scheduled data (shared for all users): `1,200` credits
2. Personalized on-demand data: `4,800` credits
3. Safety reserve/buffer: `1,000` credits

## What must be provider-fed vs internal

Provider-fed (cached heavily):

- sign daily horoscope text
- moon metrics/events
- global positions/aspects/transit primitives
- compatibility score calculation when needed
- numerology calculations

Internal/in-house (no provider credits):

- advisors list and logic
- story hub/categories/articles
- interpretation templates/rules
- magic-ball pool and yes/no policy
- draw history lock/state management

Avoid as default (high-credit endpoints):

- palmistry endpoints (100 credits)
- PDF report generation (35 credits)
- chart rendering/image endpoints (10 credits)
- astrocartography heavy endpoints (5 credits)

## Runtime credit guards (must enforce in backend)

1. Daily provider cap:
   - hard cap: `<= 220` credits/day
2. Monthly thresholds:
   - warning mode at `60%` (4,200)
   - protection mode at `80%` (5,600): disable non-essential provider calls
   - emergency mode at `95%` (6,650): cache-only for most features
3. Per-feature daily caps (initial):
   - horoscope refresh jobs: `<= 20/day`
   - moon/transit/global jobs: `<= 20/day`
   - compatibility live calls: `<= 60/day`
   - natal chart new computes: `<= 60/day`
   - numerology live calls: `<= 40/day`
   - tarot provider calls: `<= 20/day`

## Caching policy (minimum)

- Horoscope sign daily text: `24h`
- Moon metrics/events: `6-12h`
- Global positions/aspects: `6h`
- Compatibility sign-pair matrix: `30d` precompute and reuse
- Natal chart: immutable until birth input changes
- Natal transits: `24h`
- Numerology daily: `24h`
- Tarot daily card: `24h`

## Architecture decision for scale

Do not design provider calls as request-time per user for common features.

Correct pattern:

1. scheduled ingestion -> Supabase canonical tables
2. app reads from Supabase cache first
3. provider called only on miss/expiry
4. response written back to cache

## Immediate implementation order

1. Add per-feature quotas in backend config (linked to `platform.feature_flags`).
2. Add provider-call guard middleware (checks daily/monthly caps).
3. Implement cache-first services for Today/Compatibility/Birth.
4. Keep expensive endpoints behind disabled flags until monetization math is proven.

