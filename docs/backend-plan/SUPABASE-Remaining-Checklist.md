# Supabase Remaining Checklist

This is what is still pending after migrations are applied.

## 1) API exposed schemas (Dashboard setting)

If frontend/backend will use `supabase-js` PostgREST directly, add required schemas in:

- `Project Settings -> API -> Exposed schemas`

Recommended minimum:

- `identity`
- `billing`
- `platform`
- `astro_core`
- `astro_artifacts`
- `chat`
- `interpretation`

Keep `provider_ingestion` unexposed.

Status: done (based on current dashboard screenshot).

## 2) Project secrets (Dashboard or runtime env)

Add and validate:

- astrology provider API keys
- OpenAI API key
- Roboflow API key
- Stripe secret + webhook secret

Status: pending.

## 3) Storage buckets

Buckets created via migration `20260312063433`:

- `palm_scans` (private)
- `soulmatch_images` (private)
- `astro_reports` (private)

Status: done.

## 4) Scheduled retention jobs

Add scheduled SQL/worker jobs:

- purge `provider_ingestion.provider_payload_snapshots` older than 90 days unless pinned
- purge expired temporary artifacts if needed
- clean stale idempotency keys and counters

Status: pending.

## 5) Seed/content bootstrap still pending

Current baseline seed is minimal. Still needed:

- full tarot card dataset for `astro_artifacts.tarot_cards`
- story category/article starter content
- interpretation templates and rules initial set
- advisor catalog starter data

Status: pending.

## 6) Worker runtime

Set up backend worker(s) for:

- provider fetch + mapping jobs
- interpretation resolution
- daily content refresh (moon/transits/horoscope)
- webhook processing (Stripe)

Status: pending.
