begin;

-- Wire missing references from platform.feature_computations
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'feature_computations_provider_request_id_fkey'
  ) then
    alter table platform.feature_computations
      add constraint feature_computations_provider_request_id_fkey
      foreign key (provider_request_id)
      references provider_ingestion.provider_requests (id)
      on delete set null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'feature_computations_payload_snapshot_id_fkey'
  ) then
    alter table platform.feature_computations
      add constraint feature_computations_payload_snapshot_id_fkey
      foreign key (payload_snapshot_id)
      references provider_ingestion.provider_payload_snapshots (id)
      on delete set null;
  end if;
end$$;

-- =========================================================
-- astro_core (canonical facts)
-- =========================================================

create table if not exists astro_core.chart_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  chart_type text not null default 'natal',
  system_type text not null default 'western',
  zodiac_type text not null default 'tropical',
  house_system text not null default 'placidus',
  ayanamsa text null,
  birth_datetime_utc timestamptz not null,
  birth_place_name text null,
  latitude numeric(9,6) null,
  longitude numeric(9,6) null,
  sun_sign text not null,
  moon_sign text null,
  rising_sign text null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  bodies_json jsonb not null default '[]'::jsonb,
  houses_json jsonb not null default '[]'::jsonb,
  aspects_json jsonb not null default '[]'::jsonb,
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chart_snapshots_user_created
on astro_core.chart_snapshots (user_id, created_at desc);

create trigger trg_chart_snapshots_updated_at
before update on astro_core.chart_snapshots
for each row execute function platform.set_updated_at();

create table if not exists astro_core.moon_facts_daily (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  system_type text not null default 'western',
  phase_name text not null,
  illumination_pct numeric(5,2) not null,
  age_days numeric(6,2) not null,
  sign text null,
  is_waxing boolean not null,
  phase_start_at timestamptz null,
  phase_end_at timestamptz null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fact_date, system_type, contract_version)
);

create table if not exists astro_core.moon_events (
  id uuid primary key default gen_random_uuid(),
  event_at timestamptz not null,
  event_date date not null,
  system_type text not null default 'western',
  event_type text not null,
  sign text null,
  title text not null,
  description text null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists astro_core.transit_facts_daily (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  system_type text not null default 'western',
  transiting_planet text not null,
  target_planet text null,
  aspect_type text null,
  orb numeric(6,3) null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  duration_class text not null default 'short_term' check (duration_class in ('short_term','long_term','event')),
  title text null,
  interpretation text null,
  intensity text null check (intensity in ('low','medium','high')),
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists astro_core.retrograde_periods (
  id uuid primary key default gen_random_uuid(),
  system_type text not null default 'western',
  planet text not null,
  sign text null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  interpretation text null,
  tags jsonb not null default '[]'::jsonb,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists astro_core.astro_event_facts (
  id uuid primary key default gen_random_uuid(),
  event_at timestamptz not null,
  event_date date not null,
  system_type text not null default 'western',
  event_type text not null,
  significance text not null default 'medium' check (significance in ('low','medium','high')),
  title text not null,
  description text null,
  tags jsonb not null default '[]'::jsonb,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists astro_core.compatibility_facts (
  id uuid primary key default gen_random_uuid(),
  system_type text not null default 'western',
  sign_a text not null,
  sign_b text not null,
  overall int not null check (overall between 0 and 100),
  love int not null check (love between 0 and 100),
  career int not null check (career between 0 and 100),
  friendship int not null check (friendship between 0 and 100),
  sex int not null check (sex between 0 and 100),
  summary text not null,
  strengths jsonb not null default '[]'::jsonb,
  challenges jsonb not null default '[]'::jsonb,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (system_type, sign_a, sign_b, contract_version)
);

create table if not exists astro_core.numerology_profile_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  system_type text not null default 'western',
  core_numbers jsonb not null default '{}'::jsonb,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (subject_id, system_type, contract_version)
);

create table if not exists astro_core.numerology_daily_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  fact_date date not null,
  system_type text not null default 'western',
  personal_day_number int null,
  lucky_number int null,
  summary text null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (subject_id, fact_date, system_type, contract_version)
);

commit;
