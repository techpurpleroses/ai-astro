begin;

-- Provider registry baseline
insert into provider_ingestion.provider_registry
  (code, display_name, base_url, auth_mode, is_active, config)
values
  (
    'astrology_api_io',
    'Astrology-API.io',
    'https://api.astrology-api.io',
    'bearer',
    true,
    '{"notes":"Primary western provider","openapi":"https://api.astrology-api.io/api/v3/openapi.json"}'::jsonb
  ),
  (
    'astrologyapi',
    'AstrologyAPI.com',
    'https://json.astrologyapi.com',
    'basic',
    false,
    '{"notes":"Secondary fallback provider"}'::jsonb
  ),
  (
    'prokerala',
    'Prokerala',
    'https://api.prokerala.com',
    'oauth2',
    false,
    '{"notes":"Optional fallback for horoscope and panchang flows"}'::jsonb
  )
on conflict (code) do update
set
  display_name = excluded.display_name,
  base_url = excluded.base_url,
  auth_mode = excluded.auth_mode,
  is_active = excluded.is_active,
  config = excluded.config;

-- Baseline feature flags
insert into platform.feature_flags
  (feature_key, enabled, tier_required, rollout_percentage, kill_switch, config)
values
  ('today.horoscope', true, null, 100, false, '{"cache_ttl_minutes": 1440}'::jsonb),
  ('today.horoscope.categories', true, null, 100, false, '{"cache_ttl_minutes": 1440}'::jsonb),
  ('today.moon', true, null, 100, false, '{"cache_ttl_minutes": 720}'::jsonb),
  ('today.events', true, null, 100, false, '{"cache_ttl_minutes": 360}'::jsonb),
  ('today.daily_readings', true, null, 100, false, '{"cache_ttl_minutes": 1440}'::jsonb),
  ('compatibility.report', true, null, 100, false, '{"cache_ttl_minutes": 10080}'::jsonb),
  ('compatibility.best_matches', true, null, 100, false, '{"cache_ttl_minutes": 10080}'::jsonb),
  ('compatibility.today_matches', true, null, 100, false, '{"cache_ttl_minutes": 1440}'::jsonb),
  ('birth_chart.compute', true, null, 100, false, '{"daily_limit_free": 2, "daily_limit_paid": 10}'::jsonb),
  ('birth_chart.view', true, null, 100, false, '{}'::jsonb),
  ('birth_chart.transits', true, null, 100, false, '{"cache_ttl_minutes": 1440}'::jsonb),
  ('features.biorhythm', true, null, 100, false, '{"cache_ttl_minutes": 1440}'::jsonb),
  ('features.tarot', true, null, 100, false, '{"daily_limit_free": 10, "daily_limit_paid": 100}'::jsonb),
  ('features.magic_ball', true, null, 100, false, '{"daily_limit_free": 20, "daily_limit_paid": 200}'::jsonb),
  ('features.palm', true, 'pro', 100, false, '{"daily_limit_free": 1, "daily_limit_paid": 5}'::jsonb),
  ('features.soulmate', true, 'pro', 100, false, '{"weekly_limit_free": 1, "weekly_limit_paid": 5}'::jsonb),
  ('features.story', true, null, 100, false, '{}'::jsonb),
  ('features.astrocartography', true, 'pro', 100, false, '{}'::jsonb),
  ('advisors.list', true, null, 100, false, '{}'::jsonb),
  ('advisors.chat', true, 'pro', 100, false, '{"credit_required": true}'::jsonb),
  ('reports.view', true, null, 100, false, '{}'::jsonb)
on conflict (feature_key) do update
set
  enabled = excluded.enabled,
  tier_required = excluded.tier_required,
  rollout_percentage = excluded.rollout_percentage,
  kill_switch = excluded.kill_switch,
  config = excluded.config;

-- Seed minimal magic-ball answer pool
insert into astro_artifacts.magic_ball_answer_pool
  (answer, sentiment, weight, locale, is_active)
values
  ('Yes, definitely.', 'positive', 3, 'en', true),
  ('Signs point to yes.', 'positive', 2, 'en', true),
  ('Ask again later.', 'neutral', 2, 'en', true),
  ('Unclear right now.', 'neutral', 2, 'en', true),
  ('Do not count on it.', 'negative', 2, 'en', true),
  ('Better not now.', 'negative', 1, 'en', true)
on conflict do nothing;

commit;
