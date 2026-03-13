begin;

-- =========================================================
-- DB-driven pricing catalog for Stripe
-- Allows future price changes without env-var redeploys.
-- =========================================================

create table if not exists billing.plan_catalog (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  display_name text not null,
  description text null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_plan_catalog_updated_at
before update on billing.plan_catalog
for each row execute function platform.set_updated_at();

create table if not exists billing.plan_price_versions (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null references billing.plan_catalog (plan_code) on delete cascade,
  stripe_price_id text not null unique,
  lookup_key text null,
  currency text not null default 'INR',
  billing_interval text not null check (billing_interval in ('month','year','one_time')),
  billing_interval_count int not null default 1 check (billing_interval_count > 0),
  amount_minor int not null check (amount_minor >= 0),
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists idx_plan_price_versions_lookup
on billing.plan_price_versions (plan_code, currency, billing_interval, is_active, effective_from desc);

create unique index if not exists uq_plan_price_versions_active_open
on billing.plan_price_versions (plan_code, currency, billing_interval)
where is_active = true and effective_to is null;

create trigger trg_plan_price_versions_updated_at
before update on billing.plan_price_versions
for each row execute function platform.set_updated_at();

-- Baseline plan catalog rows.
insert into billing.plan_catalog (plan_code, display_name, description, sort_order)
values
  ('basic', 'Basic', 'Starter access', 10),
  ('pro', 'Pro', 'Advanced access', 20),
  ('enterprise', 'Enterprise', 'Full access and priority support', 30)
on conflict (plan_code) do nothing;

-- =========================================================
-- RLS + policies
-- =========================================================

alter table billing.plan_catalog enable row level security;
alter table billing.plan_price_versions enable row level security;

create policy "plan_catalog_read_all"
on billing.plan_catalog
for select
using (true);

create policy "plan_price_versions_read_all"
on billing.plan_price_versions
for select
using (true);

create policy "plan_catalog_service_all"
on billing.plan_catalog
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "plan_price_versions_service_all"
on billing.plan_price_versions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =========================================================
-- Grants
-- =========================================================

grant select on table billing.plan_catalog to anon;
grant select on table billing.plan_price_versions to anon;

grant select on table billing.plan_catalog to authenticated;
grant select on table billing.plan_price_versions to authenticated;

grant all privileges on table billing.plan_catalog to service_role;
grant all privileges on table billing.plan_price_versions to service_role;

commit;
