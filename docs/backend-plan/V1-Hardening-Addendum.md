# AstroAI Backend v1 Hardening Addendum

Last updated: 2026-03-12

This addendum extends the backend architecture plan with operational controls required for scale safety, cost control, and production reliability.

## Why this addendum exists

The base architecture is strong, but these layers must be explicit before implementation:

- Rate limiting and abuse controls for expensive features.
- Entitlement gate to centralize paid/free access rules.
- Async job queue with retries and dead-letter handling.
- Idempotency and deduplication for payments, providers, and jobs.
- Feature flags for safe rollouts and emergency kill switches.
- Analytics/observability for product and ops decisions.
- Data governance for retention, privacy, and recovery.

## Scope alignment with current repo

Current app routes and features covered:

- Today: horoscope, moon, retrogrades/events, daily readings.
- Compatibility: report, best matches, today's matches.
- Birth chart: big three, planets, houses, aspects, transits.
- Advisors: cards and chat.
- Features: palm reading, tarot (all modes), soulmate, story.
- Settings/reports: paid report artifacts.
- Billing target: Stripe subscriptions + credits.

Current technical state:

- Frontend consumes static data from `src/data/*`.
- Palm API routes exist and persist local JSON files.
- Supabase plan exists in docs but not wired end-to-end in runtime.

This addendum defines the missing hardening pieces before migration to full backend APIs.

---

## 1) Critical controls to add now

### 1.1 Entitlement Gate (mandatory)

All expensive feature entrypoints must pass one shared authorization decision.

Decision sources:

- Subscription status (`billing.subscriptions`)
- Credit balance (`billing.credit_transactions` rollup)
- Feature flags (`platform.feature_flags`)
- Per-user and per-IP rate limits (`platform.usage_counters`)

Decision output:

- `allow` boolean
- `reason_code` (`ok`, `no_subscription`, `insufficient_credits`, `rate_limited`, `feature_disabled`)
- `charge_plan` (`none`, `per_call`, `per_minute`)
- `trace_id`

### 1.2 Idempotency + dedup (mandatory)

Required for:

- Stripe webhooks (prevent double credits / double subscription updates)
- Provider pulls (avoid repeated billable calls)
- Job workers (avoid duplicate artifact rows)

Mechanisms:

- Request idempotency key table.
- Unique natural keys on artifact tables.
- Job uniqueness key per `(feature_key, user_id, subject_id, date_window, contract_version)`.

### 1.3 Async queue with dead-letter queue (mandatory)

Heavy workloads must run out-of-band:

- Palm scan interpretation
- Soulmate image generation
- Report generation
- Daily refresh jobs
- Provider backfills

Queue requirements:

- Retry with backoff
- Max attempts
- Dead-letter queue
- Replay endpoint for ops/admin
- Job timeout and heartbeat

### 1.4 Rate limits and budget guardrails (mandatory)

Per-feature limits must exist before public launch.

Default limits (adjustable by tier/flag):

| Feature | Free | Paid |
|---|---:|---:|
| Birth chart recompute | 2/day | 10/day |
| Tarot draws | 10/day | 100/day |
| Palm scan | 1/day | 5/day |
| Soulmate sketch | 1/week | 5/week |
| Compatibility full report | 3/day | 30/day |
| Advisor chat start | credit-gated | credit-gated |

Also add provider budget controls:

- Daily spend cap by provider.
- Circuit breaker on repeated upstream failure.
- Automatic stale fallback when breaker open.

### 1.5 Observability and alerting (mandatory)

Logs alone are insufficient. Add metrics and alerts:

- Provider error rate by feature
- p95 latency by endpoint
- Queue lag and dead-letter count
- Stripe webhook failure rate
- Cost burn rate per provider/day

Minimum tools:

- Structured logs + trace IDs
- Error tracking (Sentry)
- Metrics sink (OTel-compatible backend)

---

## 2) Additional platform tables (SQL-first blueprint)

These are additive to the base schema plan.

### 2.1 `platform.idempotency_keys`

Purpose: prevent duplicate side effects.

Columns:

- `id uuid pk`
- `scope text not null` (`stripe_webhook`, `api_request`, `job_execution`)
- `idempotency_key text not null`
- `request_hash text null`
- `response_hash text null`
- `status text not null` (`in_progress`, `completed`, `failed`)
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes/constraints:

- Unique: `(scope, idempotency_key)`
- Index: `(expires_at)`

### 2.2 `platform.feature_flags`

Purpose: runtime control without redeploy.

Columns:

- `id uuid pk`
- `feature_key text not null`
- `enabled boolean not null default true`
- `tier_required text null` (`free`, `pro`, `premium`)
- `rollout_percentage int not null default 100`
- `kill_switch boolean not null default false`
- `provider_override text null`
- `config jsonb not null default '{}'::jsonb`
- `updated_by uuid null`
- `updated_at timestamptz not null default now()`

Indexes/constraints:

- Unique: `(feature_key)`

### 2.3 `platform.usage_events`

Purpose: auditable usage stream for abuse/cost/analytics.

Columns:

- `id uuid pk`
- `user_id uuid null`
- `subject_id uuid null`
- `ip_hash text not null`
- `feature_key text not null`
- `action text not null`
- `units numeric(12,3) not null default 1`
- `cost_estimate_inr numeric(12,4) null`
- `trace_id text not null`
- `meta jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Indexes:

- `(feature_key, created_at desc)`
- `(user_id, created_at desc)`
- `(ip_hash, created_at desc)`

### 2.4 `platform.usage_counters`

Purpose: fast limit checks without scanning event stream.

Columns:

- `id uuid pk`
- `window_key text not null` (e.g., `2026-03-12`, `2026-W11`, `2026-03`)
- `scope text not null` (`user`, `ip`, `user_feature`, `ip_feature`)
- `user_id uuid null`
- `ip_hash text null`
- `feature_key text null`
- `counter bigint not null default 0`
- `updated_at timestamptz not null default now()`

Indexes/constraints:

- Unique: `(window_key, scope, coalesce(user_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(ip_hash,''), coalesce(feature_key,''))`
- Index: `(updated_at)`

### 2.5 `platform.analytics_events`

Purpose: product analytics and conversion tracking.

Columns:

- `id uuid pk`
- `event_name text not null`
- `user_id uuid null`
- `subject_id uuid null`
- `session_id text null`
- `feature_key text null`
- `source_page text null`
- `trace_id text not null`
- `properties jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Indexes:

- `(event_name, created_at desc)`
- `(user_id, created_at desc)`
- GIN on `properties` (only if queried heavily)

### 2.6 `platform.feature_jobs`

Purpose: queue table if using DB-backed queue.

Columns:

- `id uuid pk`
- `job_type text not null`
- `feature_key text not null`
- `user_id uuid null`
- `subject_id uuid null`
- `payload jsonb not null`
- `status text not null` (`queued`, `running`, `retrying`, `done`, `failed`, `dead`)
- `attempt int not null default 0`
- `max_attempts int not null default 5`
- `run_after timestamptz not null default now()`
- `locked_by text null`
- `locked_at timestamptz null`
- `timeout_seconds int not null default 300`
- `error_code text null`
- `error_message text null`
- `trace_id text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(status, run_after)`
- `(job_type, created_at desc)`
- Partial index for dequeue: `where status in ('queued','retrying')`

### 2.7 `platform.dead_letter_jobs`

Purpose: retained failed jobs for replay.

Columns:

- `id uuid pk`
- `feature_job_id uuid not null`
- `job_type text not null`
- `feature_key text not null`
- `payload jsonb not null`
- `attempt int not null`
- `error_code text null`
- `error_message text null`
- `trace_id text not null`
- `failed_at timestamptz not null default now()`
- `replayed_at timestamptz null`
- `replayed_by uuid null`

### 2.8 `platform.moderation_events`

Purpose: track unsafe chat/prompt behavior.

Columns:

- `id uuid pk`
- `user_id uuid null`
- `session_ref text null`
- `source text not null` (`advisor_chat`, `story_prompt`, `report_prompt`)
- `severity text not null` (`low`, `medium`, `high`)
- `decision text not null` (`allow`, `block`, `review`)
- `categories jsonb not null default '[]'::jsonb`
- `trace_id text not null`
- `created_at timestamptz not null default now()`

### 2.9 `platform.incident_pins`

Purpose: keep snapshots/artifacts from retention purge while issues are open.

Columns:

- `id uuid pk`
- `resource_type text not null` (`provider_payload_snapshot`, `feature_computation`, `report_artifact`)
- `resource_id uuid not null`
- `reason text not null`
- `opened_by uuid null`
- `closed_at timestamptz null`
- `created_at timestamptz not null default now()`

---

## 3) Essential indexes and partitioning

For growth safety, pre-plan partitioning on high-write event tables:

- `platform.analytics_events`: monthly partitions by `created_at`.
- `platform.usage_events`: monthly partitions by `created_at`.
- `provider_ingestion.provider_requests`: monthly partitions by `requested_at`.
- `chat.chat_messages`: monthly partitions by `created_at` if message volume grows.

If partitioning is deferred in v1, create migration hooks now:

- `created_at` NOT NULL on all candidate tables.
- Composite indexes include time column.

---

## 4) Middleware and service responsibilities

Every protected endpoint follows the same pipeline:

1. Authenticate user and resolve `subject_id`.
2. Load feature flag for `feature_key`.
3. Run entitlement gate (subscription + credits + feature flag).
4. Run rate-limit check (user + IP + feature window).
5. Dedup/idempotency check (request hash + idempotency key where applicable).
6. Execute fast path from cached artifact if valid.
7. If compute needed, enqueue async job or run sync only for cheap path.
8. Persist `feature_computations` status transitions with `trace_id`.
9. Emit `usage_events` and `analytics_events`.
10. Return canonical DTO envelope.

Canonical response envelope:

```json
{
  "data": {},
  "meta": {
    "source_provider": "astrology-api-io",
    "freshness_status": "fresh",
    "computed_at": "2026-03-12T09:30:00Z",
    "contract_version": "v1",
    "degraded": false,
    "trace_id": "trc_01..."
  },
  "errors": []
}
```

---

## 5) RLS and security hardening

### 5.1 RLS required (user-owned)

- `identity.subjects`
- user-scoped rows in `astro_core` and `astro_artifacts`
- `chat.chat_sessions`, `chat.chat_messages`
- all `billing.*` user financial rows
- user rows in `platform.feature_computations`, `platform.usage_events`

Policy shape:

- `USING (auth.uid() = user_id)`
- `WITH CHECK (auth.uid() = user_id)` for inserts/updates

### 5.2 Service-role only

- `provider_ingestion.*` payload/request internals
- webhook processors and queue workers
- dead-letter replay operations

### 5.3 Secrets and keys

- Provider keys server-only.
- Stripe webhook secret verified per request.
- OpenAI keys and Roboflow keys server-only.

---

## 6) Data governance and retention policy

Retention defaults:

- Provider payload snapshots: 90 days.
- Usage/analytics raw events: 180 days (aggregate longer if needed).
- Financial records: retain permanently or per legal requirement.
- Chat messages: business policy driven; default 12-24 months unless user deletion requested.

Purge rule:

- Never purge pinned resources (`provider_payload_pins` or `platform.incident_pins`) tied to open incidents.

Privacy controls:

- IP stored as hash, not raw IP.
- PII export/delete workflow for user requests.
- Encrypt sensitive fields at rest where required by policy.

---

## 7) Observability SLOs and alerts

Minimum SLO targets:

- API success rate: >= 99.5% (excluding 4xx).
- p95 response: < 800ms for cached reads.
- Job completion: 95% within 2 minutes for normal feature jobs.
- Stripe webhook success: >= 99.9%.

Must-have alerts:

- Provider failure rate > 10% for 5 min.
- Queue lag > threshold (e.g., 500 queued for > 10 min).
- Dead-letter jobs > threshold/hour.
- Webhook failures > threshold.
- Daily provider spend exceeds budget cap.

---

## 8) v1 implementation phases (hardening-first)

Phase H1 (mandatory before public beta):

- Add `idempotency_keys`, `feature_flags`, `usage_events`, `usage_counters`, `feature_jobs`, `dead_letter_jobs`.
- Implement entitlement gate middleware.
- Add rate-limit enforcement middleware.
- Add queue worker with retry and dead-letter logic.
- Add canonical trace IDs across API -> job -> provider.

Phase H2:

- Add analytics event pipeline.
- Add moderation event tracking for advisor chat.
- Add incident pinning + retention-aware purge jobs.
- Add alerts and dashboards.

Phase H3:

- Partition high-volume tables.
- Add replay tooling for dead-letter jobs.
- Add advanced spend optimizer (dynamic provider routing by cost/latency).

---

## 9) Acceptance checklist (go-live gate)

Launch is blocked until all items below are true:

- No expensive endpoint bypasses entitlement gate.
- No expensive endpoint bypasses rate limiter.
- Stripe webhook is idempotent and replay-safe.
- At-least-once job execution does not produce duplicate business side effects.
- Provider outages degrade to stale/cached path without contract break.
- Feature flag kill switch can disable any expensive feature within 1 minute.
- Core alerts are active and tested.
- Retention jobs ignore pinned records.

---

## 10) Repo-specific migration note

During migration from static JSON hooks to backend:

- Keep `src/types/index.ts` as contract target.
- Replace each hook's JSON import with API fetch in small batches by module.
- Palm route should move from local file persistence to DB + object storage, with auth-bound user ownership and entitlement checks.

Suggested execution order:

1. Today module APIs
2. Compatibility APIs
3. Birth chart APIs
4. Tarot and stories APIs
5. Advisors + billing APIs
6. Palm and soulmate APIs

