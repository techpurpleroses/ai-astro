# Secrets + Storage Runbook

## Current status

- Data API exposed schemas: already configured.
- Storage buckets and policies: created via migration `20260312063433`.
- `.env.example`: added with required variables.

## Required secrets to set

Set these in deployment (Vercel/worker env) and Supabase Edge Functions secrets if functions use them:

- `OPENAI_API_KEY`
- `ASTROLOGY_API_KEY` (or provider-specific keys)
- `ROBOFLOW_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Provider-specific optional keys

- `PROKERALA_CLIENT_ID`
- `PROKERALA_CLIENT_SECRET`
- `ASTROLOGYAPI_USER_ID`
- `ASTROLOGYAPI_API_KEY`

For `astrology_api_io` specifically, normally required:

- `ASTROLOGY_API_KEY`
- `ASTROLOGY_API_BASE_URL` (default: `https://api.astrology-api.io`)

`ASTROLOGY_API_SECRET` is optional and only needed if a provider explicitly requires it.

## Stripe pricing model (future-proof)

- Do not hardcode `STRIPE_PRICE_*` env vars.
- Pricing is DB-driven via:
  - `billing.plan_catalog`
  - `billing.plan_price_versions`
- To change price later:
  1. Add new Stripe Price in Stripe dashboard.
  2. Insert new row in `billing.plan_price_versions` with new `stripe_price_id`.
  3. Close old version by setting `effective_to` and/or `is_active=false`.

## Storage buckets created

- `palm_scans` (private)
- `soulmatch_images` (private)
- `astro_reports` (private)

## Storage path convention

- `palm_scans/{user_id}/{scan_id}/{file}`
- `soulmatch_images/{user_id}/{soulmatch_id}/{file}`
- `astro_reports/{user_id}/{report_type}/{report_id}.pdf`

## Security behavior

- Authenticated users can only CRUD files in their own `{user_id}/...` folder.
- No public (`anon`) access to these buckets.
- `service_role` has backend access.
