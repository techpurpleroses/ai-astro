# Backend Folder Structure (Reusable + AstroAI)

```text
src/server
  app/
    container.ts
  foundation/                  # reusable across SaaS
    contracts.ts
    errors.ts
    result.ts
    modules/
      identity/
      billing/
      usage/
      jobs/
  integrations/                # reusable adapter pattern
    astrology/
    ai/openai/
    vision/roboflow/
    payments/stripe/
  products/
    astroai/                   # AstroAI-specific
      contracts.ts
      modules/
        today/
        compatibility/
        birth-chart/
        features/
```

## Reuse Strategy

- Copy `foundation/*` and `integrations/*` to another SaaS.
- Keep `products/astroai/*` only for astrology domain.
- New SaaS can add `products/<new-saas-name>/*` without touching foundation.

