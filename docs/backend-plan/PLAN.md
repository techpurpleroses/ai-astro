# AstroAI Dashboard Backend Plan

## Summary
This file is the implementation-facing source of truth for the AstroAI authenticated dashboard backend.

The dashboard will use a server-first BFF architecture on top of the Supabase schemas already created in this repo. Frontend pages must read only AstroAI backend contracts, never provider payloads and never `src/data/*` at runtime.

Locked baseline decisions:

- `astro_core` stores canonical astrology facts.
- `astro_artifacts` stores rendered dashboard outputs and user artifacts.
- `interpretation` stores reusable authored copy, templates, and rules.
- `chat` stores advisors, chat sessions, messages, and report catalog.
- `provider_ingestion` stores raw provider requests and payload snapshots for audit/debug only.
- `astrology-api.io` is the baseline astrology fact provider.
- `Roboflow` is the baseline palm detection provider.
- `OpenAI` is limited to advisor chat responses and soulmate image generation.
- Dashboard scope here excludes onboarding and public landing pages.
- Provider prose is never treated as canonical fact.
- Dashboard contracts are preserved as `v1` and must stay versioned going forward.
- Subject modeling starts with separate timezone fields for birth-context logic and daily personalization logic.
- In `v1`, compatibility is split into two separate products from day one:
  - quick compatibility = sign-pair compatibility
  - deep compatibility = subject-pair compatibility
- In `v1`, `astro_core.compatibility_facts` means sign-pair compatibility only.

## Document Status

### Active reference documents
These files are active implementation inputs and should be treated as authoritative support documents for this plan:

- `API-Plan-All.md`
- `API-Plan-Astrology-API-io.md`
- `Astrology-API-io-Credit-Budget-Policy.md`
- `Astrology-API-io-Live-Audit-and-Backend-Plan.md`
- `V1-Hardening-Addendum.md`
- `BACKEND-Folder-Structure.md`
- `Secrets-Storage-Runbook.md`
- `Auth-Production-Runbook.md`
- `SUPABASE-Remaining-Checklist.md`

### Historical or comparison-only documents
These files must not be used as the primary implementation source because they contain stale assumptions, alternate providers, or superseded architecture:

- `SUPABASE_PLAN.md`
- `AstroData - Feature Grouping.docx`
- `AstroData - Feature Architecture Plan.docx`
- `API-Plan-Prokerala.md`
- `API-Plan-AstrologyAPI.md`

### Source-of-truth rule
- Build from this `PLAN.md` plus the active reference set above.
- Only use provider endpoints that were live-validated in `Astrology-API-io-Live-Audit-and-Backend-Plan.md` or explicitly revalidated before implementation.
- If an older file conflicts with this file, this file wins.

## Core Architecture Decisions

### Data ownership
- `astro_core` = canonical structured astrology facts
- `astro_artifacts` = rendered dashboard artifacts and user-facing outputs
- `interpretation` = reusable authored text, rules, and template resolution
- `chat` = advisors, sessions, messages, report catalog
- `identity`, `billing`, `platform` = business, auth, usage, jobs, entitlements, analytics
- `provider_ingestion` = raw provider audit/debug only and never frontend-facing

### Fact vs interpretation boundary
This boundary is strict and must not be blurred during implementation:

- `provider_ingestion` may store raw provider prose and narrative text exactly as returned
- `astro_core` stores only structured facts, numeric values, enums, timestamps, and normalized astro state
- `interpretation` stores AstroAI-authored reusable templates, rules, and meaning layers
- `astro_artifacts` stores the final user-facing assembled output

Rule:

- provider narrative text is an external input, not canonical truth
- provider prose must never be stored in `astro_core`

### Rendering rule
For every dashboard request:

1. Read canonical and artifact data from Supabase first.
2. If data is fresh, return it immediately.
3. If data is missing or stale:
   - compute inline only for cheap fact calls
   - enqueue an async job for expensive generation
4. Persist:
   - provider request metadata
   - raw payload snapshot
   - canonical fact rows
   - rendered artifact rows where user-facing output is needed

### Composed-route partial failure policy
For composed screen endpoints such as `/api/dashboard/today`:

- return partial section payloads where safe
- attach internal freshness and status metadata per section
- fail the whole route only for critical prerequisites such as auth, subject resolution, or other required root-context failures

Rule:

- one failed sub-section must not collapse the entire screen unless the route cannot determine who the user is or which subject context applies

### Anti-conflict rules
- Frontend must not import `src/data/*` after migration.
- Provider field names must never reach frontend contracts.
- Do not store the same concept in multiple runtime locations.
- Global shared catalog data and user-owned result data must remain separate.
- All timestamps are stored in UTC.
- Daily personalization is keyed using the subject's local date, not the server date.

### Frontend contract rule
The first dashboard backend rollout must preserve the existing DTO contracts in `src/types/index.ts`. The backend adapts DB and provider data into those contracts so UI components can switch away from local mock data without broad UI rewrites.

Primary DTOs to preserve:

- `HoroscopeReading`
- `AlternativeHoroscope`
- `DailyReadings`
- `MoonData`
- `TransitsData`
- `RetrogradData`
- `BirthChartData`
- `CompatibilityData`
- `Advisor`
- `ChatMessage`
- `AdvisorReportProduct`
- `AdvisorReportDetail`
- `StoryCategory`
- `StoryArticle`

### Contract versioning and response provenance
Preserving the current DTO shape is a rollout strategy, not a reason to leave contracts unversioned forever.

Implementation rule:

- dashboard contracts are owned as `v1`
- route builders and mappers must explicitly know which contract version they are building
- route responses should carry internal provenance metadata such as:
  - `contract_version`
  - `source = cache | refreshed | stale_fallback | queued`
  - `generated_at`
  - `expires_at`
  - `subject_version` or equivalent astro context version

This metadata may stay hidden from the UI, but it must exist for debugging, analytics, and future mobile or redesign work.

## Dashboard Data Plan

### Source of truth by data class

#### Canonical astrology facts
Stored in `astro_core.*`

- birth chart snapshots
- moon facts and moon events
- transit facts
- retrograde periods
- astro event facts
- compatibility facts
- numerology facts

#### Rendered dashboard outputs
Stored in `astro_artifacts.*`

- daily horoscope artifacts
- daily category horoscope artifacts
- daily readings artifacts
- user transit artifacts
- user tarot draw artifacts
- user palm reading artifacts
- user soulmate artifacts
- report artifacts and report sections
- story content

#### Reusable authored and common content
Stored in Supabase and seeded once

- `astro_artifacts.tarot_cards`
- `astro_artifacts.magic_ball_answer_pool`
- `astro_artifacts.story_categories`
- `astro_artifacts.story_articles`
- `astro_artifacts.story_sections`
- `chat.advisors`
- `chat.advisor_report_products`
- `interpretation.interpretation_templates`
- `interpretation.interpretation_rules`

#### Platform and business state

- `identity.profiles`
- `identity.subjects`
- `billing.*`
- `platform.feature_computations`
- `platform.feature_jobs`
- `platform.usage_events`
- `platform.analytics_events`

#### Raw provider data

- `provider_ingestion.provider_requests`
- `provider_ingestion.provider_payload_snapshots`

These are write and audit only. The dashboard does not read from them directly.

## Feature-by-Feature Dashboard Plan

| Screen or module | Supabase source | Provider or external source | AI | Serving decision |
|---|---|---|---|---|
| Today primary horoscope | `astro_artifacts.daily_horoscope_artifacts` | `POST /api/v3/horoscope/personal/daily/text`, fallback `POST /api/v3/horoscope/sign/daily/text` | No | Prefer personal horoscope when subject birth data exists. Provider prose stays non-canonical and is only an input to artifact assembly. |
| Today love, career, health, day cards | `astro_artifacts.daily_category_horoscope_artifacts`, `interpretation.*` | provider daily horoscope plus transit and moon facts | No | Provider gives facts or base text; AstroAI resolves stable category output using authored templates and rules. Provider prose is not stored as canonical fact. |
| Today moon section | `astro_core.moon_facts_daily`, `astro_core.moon_events` | `POST /api/v3/data/lunar-metrics`, `POST /api/v3/lunar/events` | No | Moon facts come from provider, explainer copy comes from templates. |
| Today events and retrogrades | `astro_core.transit_facts_daily`, `astro_core.retrograde_periods`, `astro_core.astro_event_facts`, `interpretation.*` | `POST /api/v3/data/global-positions`, `POST /api/v3/data/aspects`, optional `GET /api/v3/data/now` | No | Narrative is AstroAI-authored, raw motion data comes from provider. |
| Today daily readings strip | `astro_artifacts.daily_readings_artifacts`, `astro_artifacts.tarot_cards`, `astro_artifacts.magic_ball_answer_pool` | optional `POST /api/v3/numerology/core-numbers` if numerology card is enabled | No | Tarot card of day, love tip, dos and donts, trending question stay in-house and cached. |
| Today magic ball | `astro_artifacts.magic_ball_answer_pool` | none | No | Pure AstroAI pool and selection logic. |
| Birth chart chart tab | `identity.subjects`, `astro_core.chart_snapshots` | `POST /api/v3/charts/natal` | No | Map canonical snapshot to `BirthChartData`. |
| Birth chart daily transits | `astro_artifacts.user_transit_artifacts` | `POST /api/v3/charts/natal-transits` | No | Cache by `subject_id + local_date + system_type`. |
| Compatibility quick score | `astro_core.compatibility_facts` | `POST /api/v3/analysis/compatibility-score` | No | Quick compatibility in `v1` is sign-pair only. Precompute 144 sign-pair scores and serve from DB. `astro_core.compatibility_facts` must not absorb subject-pair or deep-compatibility semantics. |
| Compatibility best matches | derived from `astro_core.compatibility_facts` | none on read | No | Nightly or scheduled ranking from sign-pair matrix. |
| Compatibility todays matches | derived artifact from compatibility matrix plus daily facts | no direct provider call on page read | No | AstroAI-owned scoring layer, not provider direct. |
| Compatibility deep report | `astro_artifacts.report_artifacts`, `astro_artifacts.report_sections` | subject-pair compatibility provider path, revalidated before implementation | No | Deep compatibility is also a `v1` product, but it is a separate subject-pair domain from quick compatibility. It must use separate provenance, entitlements, lifecycle, and artifact history from sign-pair compatibility. |
| Advisors list | `chat.advisors`, recent chat summaries from `chat.chat_sessions` | none | No | Seed advisors into DB; stop using static JSON at runtime. |
| Advisor chat | `chat.chat_sessions`, `chat.chat_messages`, `billing.entitlements`, `billing.credit_transactions` | optional cached chart facts from Supabase | Yes | OpenAI replies use cached user context, not hot-path provider calls. Each reply must preserve prompt and context provenance. |
| Advisor report catalog | `chat.advisor_report_products` | none | No | Catalog is global and user ownership is tracked elsewhere. |
| Settings and owned reports | `chat.advisor_report_products`, `astro_artifacts.report_artifacts`, `billing.entitlements` | provider only when generating a new premium artifact | No | Settings page joins catalog, ownership, and artifact state. |
| Story hub and reader | `astro_artifacts.story_categories`, `astro_artifacts.story_articles`, `astro_artifacts.story_sections` | none | No | Editorial content is Supabase-only. |
| Tarot baseline | `astro_artifacts.tarot_cards`, `astro_artifacts.user_tarot_draw_artifacts` | provider tarot endpoints are not baseline | No | Use AstroAI-authored deck and persisted draw state by default. |
| Palm reading | `astro_artifacts.user_palm_reading_artifacts`, storage bucket | Roboflow detection API | No | Detection external, interpretation internal. Provider palmistry stays disabled by default. |
| Soulmate by birth chart | `astro_artifacts.user_soulmate_artifacts`, optional `report_artifacts` | cached birth chart and compatibility facts from Supabase | Yes, image only | Narrative text comes from internal templates and rules. |
| Features landing page | mixed shared tables above | none | No | Summary cards must read from DB-backed sources, not component constants. |

### Compatibility separation from `v1`
Compatibility is intentionally split into two product layers from the first release:

- quick compatibility = lightweight sign-pair compatibility for fast comparisons, rankings, and best-match surfaces
- deep compatibility = subject-pair compatibility using real subject context and a durable report-style artifact

Rules:

- quick compatibility must read from `astro_core.compatibility_facts` only
- deep compatibility must not read or write semantic results into `astro_core.compatibility_facts`
- if structured deep-compatibility facts are persisted later, they must use a separate entity or table such as subject-pair compatibility facts, not the sign-pair table
- a quick score must never be presented as a deep score
- deep compatibility must have its own cache keys, provenance, artifact history, and entitlement checks from `v1`
- service, seed, mapper, and contract naming around `astro_core.compatibility_facts` must reinforce that it is sign-pair compatibility only

## Feature Execution Classes

Every backend feature must belong to one explicit execution class so latency, cost, and retries are predictable.

| Class | Meaning | Baseline features |
|---|---|---|
| Class A | DB-only read | story pages, advisor catalog, magic ball pool, feature landing summaries built from saved data |
| Class B | inline refresh on miss only | moon facts, natal chart first compute after subject change, numerology daily on miss, quick compatibility first miss if not already materialized |
| Class C | stale-while-revalidate | today dashboard artifacts, daily category cards, daily readings, best matches, todays matches |
| Class D | async-only | soulmate generation, deep compatibility reports, premium reports, heavy palm post-processing, advisor summaries |

Rule:

- no feature may choose execution behavior ad hoc in code
- execution class must be part of the feature design before implementation

## Subject Context, Timezone, and Versioning

### Timezone model from day one
Use two separate subject-level timezone fields from the start:

- `identity.subjects.birth_timezone`
- `identity.subjects.personalization_timezone`

Purpose:

- `birth_timezone` = birth-based astrology context and chart normalization
- `personalization_timezone` = what counts as "today" for daily dashboard features

Rules:

- `identity.profiles.preferred_timezone` is UX preference only
- `identity.subjects.birth_timezone` is used when birth data needs timezone-aware normalization
- `identity.subjects.personalization_timezone` is the authoritative timezone for subject-local date logic
- all "today" calculations for personalized dashboard data must derive from `identity.subjects.personalization_timezone`, not browser timezone and not server timezone
- changing personalization timezone alone must not imply that natal chart truth changed

### Subject version
The current schema does not yet expose an explicit subject version field. Before large-scale rollout, add one of:

- `subject_version` integer, or
- a stable astro-context hash derived from astro-relevant subject fields

This version must be used in cache keys, artifact provenance, and invalidation decisions for any derived output that depends on birth data.

Ownership rule:

- `subject_version` should be advanced centrally by a DB-side trigger on astro-relevant subject fields
- frontend code and scattered services must not manually choose when to increment it

### Invalidation matrix
Cache invalidation must be by field group, not a single blanket reset.

- identity-only changes such as display name do not invalidate astro outputs
- birth-core changes such as date, time, latitude, longitude, and `identity.subjects.birth_timezone` invalidate natal chart, transits, compatibility, and soulmate outputs
- changing `identity.subjects.personalization_timezone` invalidates daily artifacts only and must not invalidate natal chart facts by itself
- presentation or calculation preferences such as house system, zodiac mode, or interpretation tone invalidate dependent presentation artifacts but not unrelated business records
- daily context changes invalidate Today-page artifacts and daily readings without forcing full historical report regeneration

## Artifact Lifecycle Policy

Every artifact type must be explicitly classified as one of the following:

- mutable cache row
- immutable historical artifact
- both a mutable latest cache and an immutable history record

Rules:

- paid outputs and user-visible generated reports must be durable and reproducible
- ephemeral daily dashboard caches may refresh in place
- compatibility quick cache may refresh by TTL
- natal chart history should remain reproducible for the subject version that generated it
- do not overwrite a historical paid or user-visible result in place without a product-level reason

Tie-break rule:

- if a user can revisit, compare, share, purchase, or emotionally anchor on a result, persist an immutable historical artifact even if a mutable latest cache also exists

## Provider Budget and Freshness Policy

### Budget baseline
- Monthly baseline provider budget: `7,000 credits`
- Daily ceiling target: `220 credits/day`
- Budget thresholds:
  - `60%` warning
  - `80%` protection mode
  - `95%` emergency mode

### Freshness policy
- horoscope = `24h`
- moon metrics and moon events = `6h` to `12h`
- global positions and aspects = `6h`
- compatibility sign-pair facts = `30d`
- natal chart = immutable until subject birth data changes
- natal transits = `24h`
- numerology daily and profile facts = `24h`
- tarot daily artifacts = `24h`
- deep compatibility report artifacts = versioned by subject-pair context and refreshed only on explicit regeneration or invalidation

### Provider usage policy
Provider-backed and cached:

- horoscope
- moon metrics and moon events
- global positions and aspects
- natal chart
- natal transits
- compatibility score
- deep compatibility subject-pair analysis
- numerology

Internal by default, no provider credits:

- advisors
- stories
- magic ball
- interpretation templates and rules
- report catalog
- tarot baseline
- palm interpretation baseline

Do not use in the baseline dashboard hot path:

- provider palmistry endpoints
- provider PDF or report rendering endpoints
- chart image rendering endpoints
- astrocartography endpoints
- any unvalidated synastry or deep report endpoint

### Budget degradation matrix
Provider thresholds must change runtime behavior in a predictable way.

#### 60 percent warning
- log and alert only
- no user-facing degradation yet

#### 80 percent protection mode
- stop nonessential background refreshes
- disable optional recompute for noncritical features
- prefer stale cache where allowed

#### 95 percent emergency mode
- switch dashboard reads to DB-first and stale fallback mode
- pause nonessential premium generation
- require explicit product decision for any must-run paid flow exceptions

Rule:

- degradation behavior must be defined per feature before rollout, not chosen ad hoc during incidents

Premium exception policy:

- free, exploratory, and background refresh calls pause before already-promised or already-purchased premium outputs
- already-purchased premium generations may continue under queueing and stricter concurrency controls
- new premium generation requests may be queued with an explicit delayed-status backend response for caller handling, or temporarily blocked if the platform cannot honor the promise safely

## Dashboard BFF Contracts

### Screen-level backend routes
The dashboard should migrate to screen-level BFF routes:

- `GET /api/dashboard/today`
- `GET /api/dashboard/birth-chart`
- `GET /api/dashboard/compatibility`
- `POST /api/dashboard/compatibility/quick`
- `POST /api/dashboard/compatibility/deep`
- `GET /api/dashboard/compatibility/deep/:artifactId`
- `GET /api/dashboard/advisors`
- `GET /api/dashboard/advisors/:slug`
- `GET /api/dashboard/advisors/:slug/messages`
- `POST /api/dashboard/advisors/:slug/messages`
- `GET /api/dashboard/features`
- `GET /api/dashboard/features/story`
- `GET /api/dashboard/features/story/:slug`
- `GET /api/dashboard/features/tarot`
- `POST /api/dashboard/features/tarot/draw`
- `GET /api/dashboard/features/palm/history`
- `POST /api/dashboard/features/soulmate/generate`
- `GET /api/dashboard/settings/reports`
- `GET /api/dashboard/settings/reports/:slug`

### Internal backend layering
Backend implementation should follow `BACKEND-Folder-Structure.md`:

- `src/server/foundation` = reusable infrastructure
- `src/server/integrations` = external provider adapters
- `src/server/products/astroai` = AstroAI mappers, services, orchestration, read-model builders

### Features page contract
`GET /api/dashboard/features` must be treated as a dedicated read-model contract, not a loose aggregator. It may compose multiple domains internally, but it must have one owned response mapper and one stable response shape.

### Runtime rule
- Existing low-level astro routes remain integration and service utilities.
- Frontend should migrate to BFF routes only.
- `src/data/*` becomes seed-only content input and must not remain a runtime source.

## Authored Data and Seed Ownership

### Seed once and store in Supabase
- `chat.advisors`
- `chat.advisor_report_products`
- `astro_artifacts.tarot_cards`
- `astro_artifacts.magic_ball_answer_pool`
- `astro_artifacts.story_categories`
- `astro_artifacts.story_articles`
- `astro_artifacts.story_sections`
- `interpretation.interpretation_templates`
- `interpretation.interpretation_rules`

### Repo-to-seed migration rule
Current repo content sources such as:

- `src/data/stories.ts`
- `src/data/reports.ts`
- static advisor data
- static tarot data
- magic-ball answer pools
- mock interpretation text

must become seed fixtures or seed scripts only. No dashboard page should import them at runtime after migration.

### Naming tension notes
These are not immediate blockers, but the team should stay aware of them:

- `chat.advisor_report_products` is acceptable for now, but reports may grow into a broader commerce or catalog domain later
- `astro_artifacts.story_*` is acceptable for now, but editorial content may later justify its own content domain
- tarot baseline is acceptable for one deck now, but future multi-deck or spread support should not be forced into a too-flat model
- until any future rename happens, service and read-model code should prefer explicit semantic names such as editorial content, sign-pair compatibility, and report catalog so generic table names do not leak ambiguous meaning into runtime logic

## Hardening and Launch Controls

### Control-plane tables already present in Supabase
The database already contains the required baseline hardening structures:

- `platform.idempotency_keys`
- `platform.feature_flags`
- `platform.usage_events`
- `platform.usage_counters`
- `platform.analytics_events`
- `platform.feature_jobs`
- `platform.dead_letter_jobs`
- `platform.moderation_events`
- `platform.incident_pins`

### Required runtime wiring still pending
The plan must assume these controls are implemented in backend services before feature rollout:

- entitlement checks before premium and generative features
- idempotency enforcement for draw, generate, and report endpoints
- queue worker implementation for async jobs
- dead-letter handling and replay path
- provider budget guard integration at runtime
- observability and alerts
- retention jobs for raw payload snapshots and expirable artifacts
- natural-key deduplication so the same generation or refresh does not create duplicate jobs or duplicate billable artifacts
- chat provenance capture for prompt, context, subject version, and model settings

### Natural idempotency keys
Async and billable features must define natural keys up front.

Examples:

- `soulmate:{subject_id}:{subject_version}:{template_version}`
- `report:{user_id}:{product_id}:{context_hash}`
- `transits:{subject_id}:{local_date}:{system_type}:{subject_version}`

Rules:

- only one active job per natural key
- retries append attempts and logs rather than creating semantic duplicates
- result attachment must follow the natural key, not only a raw job id

### Advisor chat provenance and replayability
Each AI reply should persist enough context to explain and audit the answer later.

Minimum provenance:

- subject id
- subject version or astro-context hash
- prompt or template version
- referenced artifact ids or fact snapshots
- model name and major settings
- moderation result if applicable

This protects debugging, user support, and billing auditability.

### Advisor regeneration policy
Advisor AI replies are append-only artifacts.

Rules:

- regenerating a reply creates a new assistant message with its own provenance
- old replies are never overwritten in place
- regeneration must declare whether it uses the original context snapshot or the latest subject context
- session summaries must not silently mutate historical assistant messages

### Async-only features
These must not block a normal request-response cycle:

- soulmate generation
- premium report generation
- heavy palm post-processing if enabled
- scheduled daily refresh jobs
- advisor chat summaries or follow-up generated artifacts

## Implementation Sequence

1. Freeze existing frontend DTO contracts in `src/types/index.ts`.
2. Build dashboard read-model services in `src/server/products/astroai`.
3. Wire screen-level BFF routes.
4. Replace hooks that still read `src/data/*`.
5. Move shared runtime content into Supabase seeds.
6. Add cache invalidation on subject updates.
7. Turn on provider budget guards, feature flags, jobs, and observability before wider rollout.

## Test Plan

### Contract and regression
- Every dashboard BFF endpoint returns the existing frontend DTO shape.
- No dashboard screen reads `src/data/*` at runtime.
- Provider field shape changes do not require frontend changes.
- Provider adapter types and raw provider fields must not be imported into frontend code.
- Contract builders must be snapshot-tested at `v1`.

### Data correctness
- Updating a subject invalidates natal chart, natal transits, deep compatibility, and soulmate caches. Quick sign-pair compatibility is shared fact data and does not invalidate per user.
- Daily artifacts are keyed by subject-local date, not server-local date.
- Best matches and todays matches are derived from Supabase facts, not UI-side sorting.
- Global report catalog remains separate from user-owned report artifacts.
- Provider prose must never be written into `astro_core`.
- Quick sign-pair compatibility and deep subject-pair compatibility must stay separate in `v1` and must not share ambiguous semantics.

### Security and access
- RLS prevents users from reading another user's charts, chat history, palm results, soulmate results, and purchased reports.
- Shared editorial data remains readable without leaking private data.
- Provider ingestion tables remain service-role only.

### Cost and resilience
- Protection mode blocks nonessential provider calls once budget thresholds are reached.
- Cached stale artifacts are returned when provider calls fail and a valid stale artifact exists.
- Unvalidated endpoints are not called in the baseline dashboard flow.
- Async job failures create dead-letter records and do not corrupt user state.
- Per-section partial failure behavior must be explicit for composed routes such as `/api/dashboard/today`.
- Duplicate generation requests must collapse under the same idempotency key rather than producing double results.

## Assumptions and Defaults
- Dashboard scope excludes onboarding and public landing pages.
- `astrology-api.io` is the only baseline astrology provider for implementation.
- Only live-validated endpoints are eligible for baseline implementation.
- Palm remains `Roboflow + internal interpretation`, not provider palmistry.
- OpenAI remains limited to advisor chat and soulmate image generation.
- Provider narrative text may be consumed as input but is never treated as canonical fact.
- subject timezone modeling starts with separate fields for birth-context logic and personalization logic, and those meanings must not be conflated in runtime code
- `astro_core.compatibility_facts` is a sign-pair compatibility table by contract even though its name is broad
- Auth, SMTP, storage buckets, and secrets are governed by their dedicated runbooks and are prerequisites, not redefined here.
- This file is the canonical dashboard backend plan for implementation and should remain aligned with the active reference documents listed above.
