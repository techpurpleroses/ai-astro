begin;

-- =========================================================
-- Migration 17: Trial tracking, Pro Weekly + USD pricing, per-user rate limit
-- 1. Add has_used_trial to identity.profiles (trial abuse prevention)
-- 2. Extend billing_interval CHECK to include 'week'
-- 3. Archive premium plan (Free + Pro only going forward)
-- 4. Insert USD Pro prices (weekly/monthly/yearly) + USD credit packs
-- 5. Create platform.check_user_rate_limit() RPC
-- =========================================================

-- 1. Trial abuse prevention flag
alter table identity.profiles
  add column if not exists has_used_trial boolean not null default false;

comment on column identity.profiles.has_used_trial is
  'Set to true after user activates a free trial subscription. Prevents trial abuse. Written by webhook handler.';

-- 2. Extend billing_interval CHECK constraint to allow ''week''
-- PostgreSQL names inline check constraints as {table}_{column}_check
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'billing.plan_price_versions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%billing_interval%';

  if v_constraint_name is not null then
    execute 'alter table billing.plan_price_versions drop constraint ' || quote_ident(v_constraint_name);
  end if;
end $$;

alter table billing.plan_price_versions
  add constraint plan_price_versions_billing_interval_check
  check (billing_interval in ('month', 'year', 'one_time', 'week'));

-- 3. Archive premium plan (monetization decision: Free + Pro only)
update billing.plan_price_versions
  set is_active = false
  where plan_code = 'premium';

update billing.plan_catalog
  set is_active = false,
      updated_at = now()
  where plan_code = 'premium';

-- 4. Insert USD Pro prices + credit packs
-- IMPORTANT: Replace *_PLACEHOLDER stripe_price_id values with real Stripe price IDs
-- after creating the products in Stripe Dashboard (test mode first, then live).
-- Amounts in USD cents: $6.99 = 699, $19.99 = 1999, $99.00 = 9900
insert into billing.plan_price_versions
  (plan_code, stripe_price_id, lookup_key, currency, billing_interval, billing_interval_count, amount_minor, is_active)
values
  -- Pro weekly $6.99 — de-emphasized on pricing page; for users who want flexible access
  ('pro', 'price_pro_weekly_USD_PLACEHOLDER',  'astroai_pro_weekly_usd',  'USD', 'week',     1, 699,  true),
  -- Pro monthly $19.99 — normal display
  ('pro', 'price_pro_monthly_USD_PLACEHOLDER', 'astroai_pro_monthly_usd', 'USD', 'month',    1, 1999, true),
  -- Pro yearly $99.00 — default highlighted (BEST VALUE badge)
  ('pro', 'price_pro_yearly_USD_PLACEHOLDER',  'astroai_pro_yearly_usd',  'USD', 'year',     1, 9900, true),
  -- Credit pack 50 credits $9.99 — Starter
  ('free', 'price_credits_50_USD_PLACEHOLDER',  'astroai_credits_50_usd',  'USD', 'one_time', 1, 999,  true),
  -- Credit pack 100 credits $19.99 — decoy: same $/credit as 50-pack, makes 200-pack look great
  ('free', 'price_credits_100_USD_PLACEHOLDER', 'astroai_credits_100_usd', 'USD', 'one_time', 1, 1999, true),
  -- Credit pack 200 credits $29.99 — Best Value: $0.15/credit vs $0.20 for others
  ('free', 'price_credits_200_USD_PLACEHOLDER', 'astroai_credits_200_usd', 'USD', 'one_time', 1, 2999, true)
on conflict do nothing;

-- 5. Per-user daily rate limit RPC
-- Atomically increments the user's API call counter and returns whether the call is allowed.
-- Returns: (allowed bool, current_count bigint, limit_cap int)
-- Rate limits reset at midnight UTC (keyed by date string).
-- Exempt endpoints: billing, auth, settings — only feature-generating routes call this.
create or replace function platform.check_user_rate_limit(
  p_user_id  uuid,
  p_scope    text,
  p_limit    int
)
returns table (allowed boolean, current_count bigint, limit_cap int)
language plpgsql
security definer
set search_path = platform, public
as $$
declare
  v_window_key text;
  v_count      bigint;
begin
  -- Daily window key — resets at UTC midnight
  v_window_key := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');

  -- Atomic upsert: insert (counter=1) or increment existing counter
  -- ON CONFLICT expression must match the uq_usage_counters_window_scope index exactly
  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_window_key, p_scope, p_user_id, null, null, 1)
  on conflict (
    window_key,
    scope,
    coalesce(user_id,    '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(ip_hash,    ''),
    coalesce(feature_key,'')
  )
  do update set
    counter    = platform.usage_counters.counter + 1,
    updated_at = now()
  returning platform.usage_counters.counter into v_count;

  return query select (v_count <= p_limit), v_count, p_limit;
end;
$$;

revoke all on function platform.check_user_rate_limit(uuid, text, int) from public;
grant execute on function platform.check_user_rate_limit(uuid, text, int) to service_role;

commit;
