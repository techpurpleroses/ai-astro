begin;

-- =========================================================
-- Migration 16: Stripe customer ID + monetization plan update
-- Adds stripe_customer_id to identity.profiles (1 customer per user)
-- Updates billing.plan_catalog with Free/Pro/Premium + credit packs
-- Seeds billing.plan_price_versions placeholders (fill stripe_price_id
--   after creating prices in Stripe Dashboard test mode)
-- =========================================================

-- 1) stripe_customer_id on identity.profiles
alter table identity.profiles
  add column if not exists stripe_customer_id text unique;

create index if not exists idx_profiles_stripe_customer_id
  on identity.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- 2) Replace plan catalog with AstroAI tiers
-- Safe upsert: keep existing rows that match, insert new ones
insert into billing.plan_catalog (plan_code, display_name, description, sort_order, metadata)
values
  ('free',    'Free',    'Basic access — sign horoscope, moon, Big Three, daily tarot, stories', 0,
   '{"color":"#64748b","badge":null,"highlight":false}'::jsonb),
  ('pro',     'Pro',     'Full personalized horoscope, complete birth chart, palm reading, soulmate, deep compatibility', 10,
   '{"color":"#22d3ee","badge":"Most Popular","highlight":true}'::jsonb),
  ('premium', 'Premium', 'Everything in Pro + advisor chat credits included, priority generation', 20,
   '{"color":"#f59e0b","badge":"Best Value","highlight":false}'::jsonb)
on conflict (plan_code) do update
  set display_name = excluded.display_name,
      description  = excluded.description,
      sort_order   = excluded.sort_order,
      metadata     = excluded.metadata,
      updated_at   = now();

-- Remove old catalog entries that no longer apply
delete from billing.plan_catalog
  where plan_code in ('basic','enterprise')
    and not exists (
      select 1 from billing.subscriptions s where s.plan_code = billing.plan_catalog.plan_code
    );

-- 3) plan_price_versions placeholder rows
-- IMPORTANT: Replace stripe_price_id values with real IDs from Stripe Dashboard
-- (Stripe test mode > Products > Create product > Create price > copy price ID)
-- Currency is INR. Amounts are in smallest unit (paise): ₹799 = 79900.
insert into billing.plan_price_versions
  (plan_code, stripe_price_id, lookup_key, currency, billing_interval, billing_interval_count, amount_minor, is_active)
values
  -- Pro monthly ₹799
  ('pro',     'price_pro_monthly_INR_PLACEHOLDER',     'pro_monthly_inr',     'INR', 'month', 1,  79900,   true),
  -- Pro yearly ₹7,990
  ('pro',     'price_pro_yearly_INR_PLACEHOLDER',      'pro_yearly_inr',      'INR', 'year',  1,  799000,  true),
  -- Premium monthly ₹1,999
  ('premium', 'price_premium_monthly_INR_PLACEHOLDER', 'premium_monthly_inr', 'INR', 'month', 1,  199900,  true),
  -- Premium yearly ₹19,990
  ('premium', 'price_premium_yearly_INR_PLACEHOLDER',  'premium_yearly_inr',  'INR', 'year',  1,  1999000, true),
  -- Credit pack 50 credits ₹499 (one-time)
  ('free',    'price_credits_50_INR_PLACEHOLDER',      'credits_50_inr',      'INR', 'one_time', 1, 49900, true),
  -- Credit pack 100 credits ₹899 (one-time)
  ('free',    'price_credits_100_INR_PLACEHOLDER',     'credits_100_inr',     'INR', 'one_time', 1, 89900, true),
  -- Credit pack 200 credits ₹1,499 (one-time)
  ('free',    'price_credits_200_INR_PLACEHOLDER',     'credits_200_inr',     'INR', 'one_time', 1, 149900, true)
on conflict (plan_code, currency, billing_interval, billing_interval_count)
  where is_active = true and effective_to is null
  do nothing;

-- 4) Feature entitlement defaults (platform.feature_flags)
-- These are global kill switches and tier gates, not per-user rows.
-- Per-user entitlements are written by the webhook handler after subscription events.
insert into platform.feature_flags (feature_key, enabled, tier_required, rollout_percentage, config)
values
  ('horoscope.personal',           true, 'pro',     100, '{"daily_limit":1}'::jsonb),
  ('horoscope.transits',           true, 'pro',     100, '{}'::jsonb),
  ('birth_chart.full',             true, 'pro',     100, '{}'::jsonb),
  ('compatibility.deep',           true, 'pro',     100, '{"monthly_limit":3}'::jsonb),
  ('palm.scan',                    true, 'pro',     100, '{"monthly_limit":3}'::jsonb),
  ('soulmate.generate',            true, 'pro',     100, '{"monthly_limit":1}'::jsonb),
  ('tarot.modes',                  true, 'pro',     100, '{}'::jsonb),
  ('advisor.chat',                 true, 'premium', 100, '{"credits_per_message":1}'::jsonb),
  ('palm.unlimited',               true, 'premium', 100, '{}'::jsonb),
  ('soulmate.unlimited',           true, 'premium', 100, '{}'::jsonb)
on conflict (feature_key) do update
  set enabled          = excluded.enabled,
      tier_required    = excluded.tier_required,
      rollout_percentage = excluded.rollout_percentage,
      config           = excluded.config,
      updated_at       = now();

-- 5) RLS grant for new column (stripe_customer_id is PII — service_role only)
-- identity.profiles already has RLS from earlier migrations.
-- No additional policy needed; the column is readable only by the owner (auth.uid() = id)
-- and writable only by service_role (for webhook handler).

comment on column identity.profiles.stripe_customer_id is
  'Stripe Customer ID (cus_xxx). Written by webhook handler via service_role. One per user.';

commit;
