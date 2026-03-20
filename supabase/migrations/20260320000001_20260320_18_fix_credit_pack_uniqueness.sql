begin;

-- =========================================================
-- Migration 18: Fix partial unique index so multiple one-time
-- credit pack prices can coexist under the same plan_code.
--
-- The uq_plan_price_versions_active_open index enforces
-- "one active price per (plan_code, currency, interval)" which
-- made sense for subscriptions but blocks having 50/100/200
-- credit packs all with plan_code='free', billing_interval='one_time'.
--
-- Fix: exclude billing_interval='one_time' from the uniqueness
-- constraint — subscriptions still stay unique, one-time products
-- are differentiated by lookup_key instead.
-- =========================================================

-- Drop the over-broad partial unique index
drop index if exists billing.uq_plan_price_versions_active_open;

-- Recreate — subscriptions only (excludes one_time)
create unique index uq_plan_price_versions_active_open
on billing.plan_price_versions (plan_code, currency, billing_interval, billing_interval_count)
where is_active = true
  and effective_to is null
  and billing_interval != 'one_time';

-- Also add a unique index on lookup_key for one-time prices
-- so the same credit pack can't be inserted twice
create unique index if not exists uq_plan_price_versions_onetime_lookup
on billing.plan_price_versions (lookup_key)
where is_active = true
  and effective_to is null
  and billing_interval = 'one_time';

-- Insert the missing USD credit pack rows that were silently skipped
-- by the old index (only credits_50_usd made it through)
insert into billing.plan_price_versions
  (plan_code, stripe_price_id, lookup_key, currency, billing_interval, billing_interval_count, amount_minor, is_active)
values
  ('free', 'price_1TCzXeDgW4wAqiJsct9vdmti', 'astroai_credits_100_usd', 'USD', 'one_time', 1, 1999, true),
  ('free', 'price_1TCzXhDgW4wAqiJstmQis23b', 'astroai_credits_200_usd', 'USD', 'one_time', 1, 2999, true)
on conflict (lookup_key)
  where is_active = true and effective_to is null and billing_interval = 'one_time'
  do update set stripe_price_id = excluded.stripe_price_id;

-- Also insert missing INR credit packs (100 + 200) that were blocked by same issue in migration 16
insert into billing.plan_price_versions
  (plan_code, stripe_price_id, lookup_key, currency, billing_interval, billing_interval_count, amount_minor, is_active)
values
  ('free', 'price_credits_100_INR_PLACEHOLDER', 'credits_100_inr', 'INR', 'one_time', 1, 89900,  true),
  ('free', 'price_credits_200_INR_PLACEHOLDER', 'credits_200_inr', 'INR', 'one_time', 1, 149900, true)
on conflict (lookup_key)
  where is_active = true and effective_to is null and billing_interval = 'one_time'
  do nothing;

commit;
