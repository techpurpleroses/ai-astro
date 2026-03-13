begin;

create extension if not exists pgcrypto;

-- Modular schemas
create schema if not exists identity;
create schema if not exists billing;
create schema if not exists platform;
create schema if not exists provider_ingestion;
create schema if not exists astro_core;
create schema if not exists astro_artifacts;
create schema if not exists interpretation;
create schema if not exists chat;

-- Shared trigger helper
create or replace function platform.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- identity
-- =========================================================

create table if not exists identity.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text null,
  primary_subject_id uuid null,
  preferred_system text not null default 'western'
    check (preferred_system in ('western','vedic','chinese','indian_lunar','indian_solar','mayan','druid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists identity.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'My Profile',
  relationship_type text not null default 'self'
    check (relationship_type in ('self','partner','spouse','child','friend','client','other')),
  birth_date date not null,
  birth_time time null,
  timezone text null,
  birth_place_name text null,
  latitude numeric(9,6) null,
  longitude numeric(9,6) null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_subjects_one_primary_per_user
on identity.subjects (user_id)
where is_primary = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_primary_subject_id_fkey'
  ) then
    alter table identity.profiles
      add constraint profiles_primary_subject_id_fkey
      foreign key (primary_subject_id)
      references identity.subjects (id)
      on delete set null;
  end if;
end$$;

create trigger trg_profiles_updated_at
before update on identity.profiles
for each row execute function platform.set_updated_at();

create trigger trg_subjects_updated_at
before update on identity.subjects
for each row execute function platform.set_updated_at();

-- =========================================================
-- billing
-- =========================================================

create table if not exists billing.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_code text not null,
  status text not null
    check (status in ('trialing','active','past_due','canceled','paused','incomplete')),
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  provider text not null default 'stripe',
  provider_subscription_id text null,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists idx_subscriptions_user_status
on billing.subscriptions (user_id, status);

create trigger trg_subscriptions_updated_at
before update on billing.subscriptions
for each row execute function platform.set_updated_at();

create table if not exists billing.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid null references billing.subscriptions (id) on delete set null,
  provider text not null default 'stripe',
  provider_payment_id text not null,
  amount_inr numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null
    check (status in ('pending','succeeded','failed','refunded','canceled')),
  paid_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists idx_payments_user_created
on billing.payments (user_id, created_at desc);

create table if not exists billing.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tx_type text not null
    check (tx_type in ('purchase','session_charge','refund','bonus','adjustment','expiration')),
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  reference_type text null,
  reference_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_tx_user_created
on billing.credit_transactions (user_id, created_at desc);

create table if not exists billing.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature_key text not null,
  access_mode text not null
    check (access_mode in ('allow','deny','metered','subscription')),
  tier_required text null,
  credits_per_call numeric(12,2) null,
  daily_limit int null,
  weekly_limit int null,
  monthly_limit int null,
  effective_from timestamptz not null default now(),
  effective_to timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_key, effective_from)
);

create index if not exists idx_entitlements_user_feature
on billing.entitlements (user_id, feature_key, effective_to);

create trigger trg_entitlements_updated_at
before update on billing.entitlements
for each row execute function platform.set_updated_at();

-- =========================================================
-- platform (hardening/ops)
-- =========================================================

create table if not exists platform.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  request_hash text null,
  response_hash text null,
  status text not null check (status in ('in_progress','completed','failed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);

create index if not exists idx_idempotency_expires
on platform.idempotency_keys (expires_at);

create trigger trg_idempotency_keys_updated_at
before update on platform.idempotency_keys
for each row execute function platform.set_updated_at();

create table if not exists platform.feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  enabled boolean not null default true,
  tier_required text null,
  rollout_percentage int not null default 100
    check (rollout_percentage between 0 and 100),
  kill_switch boolean not null default false,
  provider_override text null,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_feature_flags_updated_at
before update on platform.feature_flags
for each row execute function platform.set_updated_at();

create table if not exists platform.feature_computations (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  user_id uuid null references auth.users (id) on delete set null,
  subject_id uuid null references identity.subjects (id) on delete set null,
  status text not null
    check (status in ('queued','running','success','partial','failed','stale_served','canceled')),
  source_provider_id uuid null,
  provider_request_id uuid null,
  payload_snapshot_id uuid null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  interpretation_mode text not null default 'internal_first',
  freshness_status text not null default 'fresh'
    check (freshness_status in ('fresh','stale','expired')),
  started_at timestamptz null,
  computed_at timestamptz null,
  expires_at timestamptz null,
  degraded boolean not null default false,
  error_code text null,
  error_message text null,
  trace_id text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_computations_feature_status
on platform.feature_computations (feature_key, status, created_at desc);

create index if not exists idx_feature_computations_user_created
on platform.feature_computations (user_id, created_at desc);

create index if not exists idx_feature_computations_subject_created
on platform.feature_computations (subject_id, created_at desc);

create trigger trg_feature_computations_updated_at
before update on platform.feature_computations
for each row execute function platform.set_updated_at();

create table if not exists platform.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete set null,
  subject_id uuid null references identity.subjects (id) on delete set null,
  ip_hash text not null,
  feature_key text not null,
  action text not null,
  units numeric(12,3) not null default 1,
  cost_estimate_inr numeric(12,4) null,
  trace_id text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_feature_created
on platform.usage_events (feature_key, created_at desc);

create index if not exists idx_usage_events_user_created
on platform.usage_events (user_id, created_at desc);

create index if not exists idx_usage_events_ip_created
on platform.usage_events (ip_hash, created_at desc);

create table if not exists platform.usage_counters (
  id uuid primary key default gen_random_uuid(),
  window_key text not null,
  scope text not null,
  user_id uuid null references auth.users (id) on delete set null,
  ip_hash text null,
  feature_key text null,
  counter bigint not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_usage_counters_window_scope
on platform.usage_counters (
  window_key,
  scope,
  coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(ip_hash, ''),
  coalesce(feature_key, '')
);

create index if not exists idx_usage_counters_updated_at
on platform.usage_counters (updated_at);

create trigger trg_usage_counters_updated_at
before update on platform.usage_counters
for each row execute function platform.set_updated_at();

create table if not exists platform.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid null references auth.users (id) on delete set null,
  subject_id uuid null references identity.subjects (id) on delete set null,
  session_id text null,
  feature_key text null,
  source_page text null,
  trace_id text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_name_created
on platform.analytics_events (event_name, created_at desc);

create index if not exists idx_analytics_events_user_created
on platform.analytics_events (user_id, created_at desc);

create table if not exists platform.feature_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  feature_key text not null,
  user_id uuid null references auth.users (id) on delete set null,
  subject_id uuid null references identity.subjects (id) on delete set null,
  payload jsonb not null,
  status text not null check (status in ('queued','running','retrying','done','failed','dead')),
  attempt int not null default 0 check (attempt >= 0),
  max_attempts int not null default 5 check (max_attempts > 0),
  run_after timestamptz not null default now(),
  locked_by text null,
  locked_at timestamptz null,
  timeout_seconds int not null default 300 check (timeout_seconds > 0),
  error_code text null,
  error_message text null,
  trace_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_jobs_status_run_after
on platform.feature_jobs (status, run_after);

create index if not exists idx_feature_jobs_type_created
on platform.feature_jobs (job_type, created_at desc);

create index if not exists idx_feature_jobs_dequeue
on platform.feature_jobs (run_after)
where status in ('queued','retrying');

create trigger trg_feature_jobs_updated_at
before update on platform.feature_jobs
for each row execute function platform.set_updated_at();

create table if not exists platform.dead_letter_jobs (
  id uuid primary key default gen_random_uuid(),
  feature_job_id uuid not null references platform.feature_jobs (id) on delete cascade,
  job_type text not null,
  feature_key text not null,
  payload jsonb not null,
  attempt int not null,
  error_code text null,
  error_message text null,
  trace_id text not null,
  failed_at timestamptz not null default now(),
  replayed_at timestamptz null,
  replayed_by uuid null references auth.users (id) on delete set null
);

create index if not exists idx_dead_letter_failed_at
on platform.dead_letter_jobs (failed_at desc);

create table if not exists platform.moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete set null,
  session_ref text null,
  source text not null,
  severity text not null check (severity in ('low','medium','high')),
  decision text not null check (decision in ('allow','block','review')),
  categories jsonb not null default '[]'::jsonb,
  trace_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_source_created
on platform.moderation_events (source, created_at desc);

create table if not exists platform.incident_pins (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id uuid not null,
  reason text not null,
  opened_by uuid null references auth.users (id) on delete set null,
  closed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_incident_pins_resource
on platform.incident_pins (resource_type, resource_id);

create index if not exists idx_incident_pins_closed_at
on platform.incident_pins (closed_at);

create table if not exists platform.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  provider_event_id text not null,
  payload jsonb not null,
  status text not null check (status in ('received','processed','failed','ignored')),
  error_message text null,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  trace_id text not null,
  unique (provider, provider_event_id)
);

create index if not exists idx_webhook_events_status_received
on platform.webhook_events (status, received_at desc);

-- =========================================================
-- provider ingestion
-- =========================================================

create table if not exists provider_ingestion.provider_registry (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  base_url text null,
  auth_mode text not null default 'bearer',
  is_active boolean not null default true,
  daily_budget_inr numeric(12,2) null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_provider_registry_updated_at
before update on provider_ingestion.provider_registry
for each row execute function platform.set_updated_at();

create table if not exists provider_ingestion.provider_feature_map (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  system_type text not null default 'western',
  provider_id uuid not null references provider_ingestion.provider_registry (id) on delete cascade,
  endpoint_key text not null,
  priority int not null default 100,
  is_enabled boolean not null default true,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feature_key, system_type, provider_id, endpoint_key)
);

create index if not exists idx_provider_feature_map_lookup
on provider_ingestion.provider_feature_map (feature_key, system_type, is_enabled, priority);

create trigger trg_provider_feature_map_updated_at
before update on provider_ingestion.provider_feature_map
for each row execute function platform.set_updated_at();

create table if not exists provider_ingestion.provider_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_ingestion.provider_registry (id) on delete restrict,
  feature_key text not null,
  user_id uuid null references auth.users (id) on delete set null,
  subject_id uuid null references identity.subjects (id) on delete set null,
  request_hash text null,
  request_payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('queued','sent','succeeded','failed','timed_out','canceled')),
  http_status int null,
  latency_ms int null,
  error_code text null,
  error_message text null,
  trace_id text not null,
  requested_at timestamptz not null default now(),
  responded_at timestamptz null
);

create index if not exists idx_provider_requests_provider_time
on provider_ingestion.provider_requests (provider_id, requested_at desc);

create index if not exists idx_provider_requests_feature_time
on provider_ingestion.provider_requests (feature_key, requested_at desc);

create index if not exists idx_provider_requests_user_time
on provider_ingestion.provider_requests (user_id, requested_at desc);

create index if not exists idx_provider_requests_status_time
on provider_ingestion.provider_requests (status, requested_at desc);

create table if not exists provider_ingestion.provider_payload_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider_request_id uuid not null references provider_ingestion.provider_requests (id) on delete cascade,
  provider_id uuid not null references provider_ingestion.provider_registry (id) on delete restrict,
  feature_key text not null,
  user_id uuid null references auth.users (id) on delete set null,
  subject_id uuid null references identity.subjects (id) on delete set null,
  payload_kind text not null check (payload_kind in ('request','response','normalized','error')),
  payload_json jsonb not null,
  payload_sha256 text null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_provider_payload_snapshots_expires
on provider_ingestion.provider_payload_snapshots (expires_at);

create index if not exists idx_provider_payload_snapshots_lookup
on provider_ingestion.provider_payload_snapshots (provider_id, feature_key, created_at desc);

create index if not exists idx_provider_payload_snapshots_request
on provider_ingestion.provider_payload_snapshots (provider_request_id);

create table if not exists provider_ingestion.provider_payload_pins (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references provider_ingestion.provider_payload_snapshots (id) on delete cascade,
  pinned_by uuid null references auth.users (id) on delete set null,
  reason text not null,
  pinned_until timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_provider_payload_pins_snapshot
on provider_ingestion.provider_payload_pins (snapshot_id);

create index if not exists idx_provider_payload_pins_until
on provider_ingestion.provider_payload_pins (pinned_until);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feature_computations_source_provider_id_fkey'
  ) then
    alter table platform.feature_computations
      add constraint feature_computations_source_provider_id_fkey
      foreign key (source_provider_id)
      references provider_ingestion.provider_registry (id)
      on delete set null;
  end if;
end$$;

-- =========================================================
-- RLS
-- =========================================================

alter table identity.profiles enable row level security;
alter table identity.subjects enable row level security;
alter table billing.subscriptions enable row level security;
alter table billing.payments enable row level security;
alter table billing.credit_transactions enable row level security;
alter table billing.entitlements enable row level security;
alter table platform.feature_computations enable row level security;
alter table platform.usage_events enable row level security;
alter table platform.analytics_events enable row level security;

create policy "profiles_select_own"
on identity.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on identity.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on identity.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "subjects_all_own"
on identity.subjects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "subscriptions_all_own"
on billing.subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "payments_select_own"
on billing.payments
for select
using (auth.uid() = user_id);

create policy "credit_transactions_select_own"
on billing.credit_transactions
for select
using (auth.uid() = user_id);

create policy "entitlements_select_own"
on billing.entitlements
for select
using (auth.uid() = user_id);

create policy "feature_computations_select_own"
on platform.feature_computations
for select
using (auth.uid() = user_id);

create policy "usage_events_select_own"
on platform.usage_events
for select
using (auth.uid() = user_id);

create policy "analytics_events_select_own"
on platform.analytics_events
for select
using (auth.uid() = user_id);

commit;
