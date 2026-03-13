begin;

create or replace function platform.consume_provider_credits(
  p_feature_key text,
  p_credits int default 1,
  p_global_daily_cap int default 220,
  p_global_monthly_cap int default 7000,
  p_feature_daily_cap int default null
)
returns table (
  allowed boolean,
  reason text,
  global_daily_used bigint,
  global_monthly_used bigint,
  feature_daily_used bigint,
  global_daily_cap int,
  global_monthly_cap int,
  feature_daily_cap int
)
language plpgsql
security definer
set search_path = platform, public
as $$
declare
  v_now timestamptz := now();
  v_day_key text := to_char((v_now at time zone 'UTC')::date, 'YYYY-MM-DD');
  v_month_key text := to_char(date_trunc('month', v_now at time zone 'UTC'), 'YYYY-MM');

  v_scope_daily text := 'provider_credit_global_daily';
  v_scope_monthly text := 'provider_credit_global_monthly';
  v_scope_feature_daily text := 'provider_credit_feature_daily';

  v_daily bigint := 0;
  v_monthly bigint := 0;
  v_feature_daily bigint := 0;
begin
  if p_feature_key is null or btrim(p_feature_key) = '' then
    return query
    select
      false,
      'feature_key_required'::text,
      0::bigint,
      0::bigint,
      0::bigint,
      p_global_daily_cap,
      p_global_monthly_cap,
      p_feature_daily_cap;
    return;
  end if;

  if p_credits <= 0 then
    return query
    select
      false,
      'credits_must_be_positive'::text,
      0::bigint,
      0::bigint,
      0::bigint,
      p_global_daily_cap,
      p_global_monthly_cap,
      p_feature_daily_cap;
    return;
  end if;

  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_day_key, v_scope_daily, null, null, null, 0)
  on conflict do nothing;

  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_month_key, v_scope_monthly, null, null, null, 0)
  on conflict do nothing;

  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_day_key, v_scope_feature_daily, null, null, p_feature_key, 0)
  on conflict do nothing;

  select counter
  into v_daily
  from platform.usage_counters
  where window_key = v_day_key
    and scope = v_scope_daily
    and user_id is null
    and ip_hash is null
    and feature_key is null
  for update;

  select counter
  into v_monthly
  from platform.usage_counters
  where window_key = v_month_key
    and scope = v_scope_monthly
    and user_id is null
    and ip_hash is null
    and feature_key is null
  for update;

  select counter
  into v_feature_daily
  from platform.usage_counters
  where window_key = v_day_key
    and scope = v_scope_feature_daily
    and user_id is null
    and ip_hash is null
    and feature_key = p_feature_key
  for update;

  if p_global_daily_cap is not null and v_daily + p_credits > p_global_daily_cap then
    return query
    select
      false,
      'global_daily_cap_exceeded'::text,
      v_daily,
      v_monthly,
      v_feature_daily,
      p_global_daily_cap,
      p_global_monthly_cap,
      p_feature_daily_cap;
    return;
  end if;

  if p_global_monthly_cap is not null and v_monthly + p_credits > p_global_monthly_cap then
    return query
    select
      false,
      'global_monthly_cap_exceeded'::text,
      v_daily,
      v_monthly,
      v_feature_daily,
      p_global_daily_cap,
      p_global_monthly_cap,
      p_feature_daily_cap;
    return;
  end if;

  if p_feature_daily_cap is not null and v_feature_daily + p_credits > p_feature_daily_cap then
    return query
    select
      false,
      'feature_daily_cap_exceeded'::text,
      v_daily,
      v_monthly,
      v_feature_daily,
      p_global_daily_cap,
      p_global_monthly_cap,
      p_feature_daily_cap;
    return;
  end if;

  update platform.usage_counters
  set counter = counter + p_credits,
      updated_at = now()
  where window_key = v_day_key
    and scope = v_scope_daily
    and user_id is null
    and ip_hash is null
    and feature_key is null;

  update platform.usage_counters
  set counter = counter + p_credits,
      updated_at = now()
  where window_key = v_month_key
    and scope = v_scope_monthly
    and user_id is null
    and ip_hash is null
    and feature_key is null;

  update platform.usage_counters
  set counter = counter + p_credits,
      updated_at = now()
  where window_key = v_day_key
    and scope = v_scope_feature_daily
    and user_id is null
    and ip_hash is null
    and feature_key = p_feature_key;

  return query
  select
    true,
    'allowed'::text,
    v_daily + p_credits,
    v_monthly + p_credits,
    v_feature_daily + p_credits,
    p_global_daily_cap,
    p_global_monthly_cap,
    p_feature_daily_cap;
end;
$$;

revoke all on function platform.consume_provider_credits(text, int, int, int, int) from public;
grant execute on function platform.consume_provider_credits(text, int, int, int, int) to service_role;

commit;
