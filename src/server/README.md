# Server Architecture

This folder is intentionally split into:

- `foundation`: reusable backend building blocks for any SaaS.
- `products/astroai`: AstroAI-specific product logic and DTO contracts.
- `integrations`: external provider clients (astrology APIs, OpenAI, Roboflow, Stripe).
- `app`: runtime composition/wiring.

## Target flow

1. `app/api/*` route handler receives request.
2. Route calls service from `products/astroai/*` or `foundation/*`.
3. Service talks to `integrations/*` and writes/reads Supabase.
4. Service returns stable DTO contract to frontend.

## Reuse rule

Portable to other SaaS:

- everything under `foundation/*`
- shared `integrations/*` wrappers (pattern, not provider payloads)

Astro-only:

- everything under `products/astroai/*`

