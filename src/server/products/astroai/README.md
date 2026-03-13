# AstroAI Product Module

Astro-specific contracts and business logic live here.

Rule:

- Inputs from providers are mapped to canonical DB models first.
- Frontend receives stable AstroAI DTO contracts only.
- Provider field names never leak to frontend.

