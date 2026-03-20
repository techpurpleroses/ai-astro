begin;

-- =========================================================
-- MIGRATION 13: Audit Remediation
-- Addresses 37 issues found in deep audit of migrations 01-12.
-- Fixes: C1-C6, H1-H9, M1, M2, M4, M6, M9, M10, L4, L6
-- =========================================================

-- =========================================================
-- C1: Rename identity.subjects.timezone → personalization_timezone
--     Add birth_timezone column (PLAN requires two separate fields)
-- =========================================================

alter table identity.subjects
  rename column timezone to personalization_timezone;

alter table identity.subjects
  add column if not exists birth_timezone text not null default 'UTC';

-- Seed birth_timezone from personalization_timezone for non-UTC existing rows
update identity.subjects
set birth_timezone = personalization_timezone
where personalization_timezone <> 'UTC';

-- Drop old constraint (named in migration 08) and replace with two constraints
alter table identity.subjects
  drop constraint if exists subjects_timezone_valid_chk;

alter table identity.subjects
  add constraint subjects_personalization_timezone_valid_chk
  check (platform.is_valid_iana_timezone(personalization_timezone));

alter table identity.subjects
  add constraint subjects_birth_timezone_valid_chk
  check (platform.is_valid_iana_timezone(birth_timezone));

comment on column identity.subjects.personalization_timezone
  is 'What counts as "today" for daily dashboard features. Used for local-date cache keys.';

comment on column identity.subjects.birth_timezone
  is 'Timezone at the moment of birth. Used for chart normalization and natal computation only. Changing this invalidates natal chart facts.';

-- Update subject_local_date to use personalization_timezone explicitly
create or replace function platform.subject_local_date(
  p_subject_id uuid,
  p_now timestamptz default now()
)
returns date
language sql
stable
as $$
  select platform.current_local_date(s.personalization_timezone, p_now)
  from identity.subjects s
  where s.id = p_subject_id;
$$;

-- =========================================================
-- C2: Restrict billing.subscriptions to select-only for authenticated
--     (subscription records must only be written by service_role/Stripe webhooks)
-- =========================================================

drop policy if exists "subscriptions_all_own" on billing.subscriptions;

create policy "subscriptions_select_own"
on billing.subscriptions
for select
using (auth.uid() = user_id);

-- =========================================================
-- C3: Remove prose interpretation fields from astro_core tables
--     (violates fact/interpretation boundary defined in PLAN.md)
-- =========================================================

-- Drop index that referenced is_active on retrograde_periods before column drop
drop index if exists astro_core.idx_retrograde_periods_active;

alter table astro_core.transit_facts_daily
  drop column if exists interpretation;

alter table astro_core.retrograde_periods
  drop column if exists interpretation;

-- =========================================================
-- C4: Add natural_key to feature_jobs with conditional unique index
--     Prevents duplicate billable job enqueuing under race conditions
-- =========================================================

alter table platform.feature_jobs
  add column if not exists natural_key text null;

comment on column platform.feature_jobs.natural_key
  is 'Semantic dedup key, e.g. soulmate:{subject_id}:{subject_version}:{template_version}. Must be set for all billable async jobs.';

create unique index if not exists uq_feature_jobs_natural_key
on platform.feature_jobs (natural_key)
where status in ('queued', 'running', 'retrying')
  and natural_key is not null;

-- =========================================================
-- C5: Harden auth user creation trigger with exception handler
--     Prevents trigger failure from blocking user registration
-- =========================================================

create or replace function identity.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = identity, public
as $$
declare
  v_display_name text;
  v_subject_id   uuid;
begin
  begin

    v_display_name := coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    );

    insert into identity.profiles (id, display_name, preferred_system)
    values (new.id, v_display_name, 'western')
    on conflict (id) do update
    set display_name = case
      when coalesce(identity.profiles.display_name, '') = '' then excluded.display_name
      else identity.profiles.display_name
    end;

    if not exists (
      select 1 from identity.subjects s
      where s.user_id = new.id and s.is_primary = true
    ) then
      insert into identity.subjects (
        user_id, label, relationship_type,
        birth_date, birth_time,
        personalization_timezone, birth_timezone,
        birth_place_name, latitude, longitude,
        is_primary, is_placeholder
      )
      values (
        new.id, 'My Profile', 'self',
        current_date, time '12:00:00',
        'UTC', 'UTC',
        null, null, null,
        true, true
      )
      returning id into v_subject_id;
    else
      select s.id into v_subject_id
      from identity.subjects s
      where s.user_id = new.id and s.is_primary = true
      order by s.created_at asc
      limit 1;
    end if;

    update identity.profiles p
    set primary_subject_id = v_subject_id
    where p.id = new.id
      and p.primary_subject_id is null
      and v_subject_id is not null;

  exception when others then
    -- Log but do not block user creation.
    -- Profile/subject rows are created on first authenticated request if missing.
    raise warning '[handle_auth_user_created] failed for user %: % — %', new.id, sqlstate, sqlerrm;
  end;

  return new;
end;
$$;

-- =========================================================
-- C6: Add is_placeholder to identity.subjects
--     Gates all provider-backed generation (no charts for placeholder subjects)
-- =========================================================

alter table identity.subjects
  add column if not exists is_placeholder boolean not null default false;

comment on column identity.subjects.is_placeholder
  is 'True when birth data has not been supplied by the user. Provider-backed chart generation must be blocked when is_placeholder = true.';

-- Mark existing subjects created by the auth trigger (noon UTC, no location, My Profile label)
-- as placeholders. Best-effort for existing data.
update identity.subjects
set is_placeholder = true
where birth_time = '12:00:00'
  and birth_place_name is null
  and latitude is null
  and longitude is null
  and label = 'My Profile'
  and relationship_type = 'self';

-- Backfill: also update backfill subjects inserted in migration 12
update identity.subjects
set is_placeholder = true
where birth_date = (
  select u.created_at::date
  from auth.users u
  where u.id = identity.subjects.user_id
  limit 1
)
and birth_time = '12:00:00'
and birth_place_name is null
and latitude is null
and longitude is null
and is_placeholder = false;

-- =========================================================
-- H1: Add sign column to daily_readings_artifacts
--     NULL sign = global reading; non-null = sign-specific reading
-- =========================================================

alter table astro_artifacts.daily_readings_artifacts
  add column if not exists sign text null;

-- Drop old unique constraint (no sign column) and replace
alter table astro_artifacts.daily_readings_artifacts
  drop constraint if exists daily_readings_artifacts_fact_date_contract_version_key;

-- New constraint: per-sign dedup (NULL sign counts as '' for uniqueness)
create unique index if not exists uq_daily_readings_date_sign_contract
on astro_artifacts.daily_readings_artifacts (fact_date, contract_version, coalesce(sign, ''));

comment on column astro_artifacts.daily_readings_artifacts.sign
  is 'Zodiac sign for sign-specific readings. NULL = global reading shared across all signs.';

-- =========================================================
-- H2: Add is_current to chart_snapshots + auto-maintain trigger
-- =========================================================

alter table astro_core.chart_snapshots
  add column if not exists is_current boolean not null default true;

comment on column astro_core.chart_snapshots.is_current
  is 'True for the latest active snapshot for this subject+chart_type+system_type. Maintained automatically by trigger.';

-- Backfill: mark all but latest per (subject, chart_type, system_type) as not current
with ranked as (
  select id,
    row_number() over (
      partition by subject_id, chart_type, system_type
      order by computed_at desc
    ) as rn
  from astro_core.chart_snapshots
)
update astro_core.chart_snapshots cs
set is_current = false
from ranked r
where cs.id = r.id and r.rn > 1;

create index if not exists idx_chart_snapshots_current_lookup
on astro_core.chart_snapshots (subject_id, chart_type, system_type)
where is_current = true;

create or replace function astro_core.maintain_chart_snapshot_current()
returns trigger
language plpgsql
as $$
begin
  update astro_core.chart_snapshots
  set is_current = false
  where subject_id = new.subject_id
    and chart_type = new.chart_type
    and system_type = new.system_type
    and id <> new.id
    and is_current = true;
  return new;
end;
$$;

drop trigger if exists trg_chart_snapshots_maintain_current on astro_core.chart_snapshots;
create trigger trg_chart_snapshots_maintain_current
after insert on astro_core.chart_snapshots
for each row execute function astro_core.maintain_chart_snapshot_current();

-- =========================================================
-- H3: Add FK billing.subscriptions.plan_code → billing.plan_catalog
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_plan_code_fkey'
  ) then
    alter table billing.subscriptions
      add constraint subscriptions_plan_code_fkey
      foreign key (plan_code)
      references billing.plan_catalog (plan_code)
      on update cascade
      on delete restrict;
  end if;
end$$;

-- =========================================================
-- H4: Soft-delete for identity.subjects
--     Revoke hard-delete from authenticated; add guard trigger
-- =========================================================

revoke delete on table identity.subjects from authenticated;

alter table identity.subjects
  add column if not exists deleted_at timestamptz null;

comment on column identity.subjects.deleted_at
  is 'Soft-delete timestamp. Non-null rows are excluded from all user-facing reads. Hard delete is service_role only.';

-- Replace all-in-one policy with granular policies that hide soft-deleted rows
drop policy if exists "subjects_all_own" on identity.subjects;

create policy "subjects_select_own_active"
on identity.subjects
for select
using (auth.uid() = user_id and deleted_at is null);

create policy "subjects_insert_own"
on identity.subjects
for insert
with check (auth.uid() = user_id);

create policy "subjects_update_own_active"
on identity.subjects
for update
using (auth.uid() = user_id and deleted_at is null)
with check (auth.uid() = user_id);

-- Guard: block soft-deleting primary subject when no other active subject exists
create or replace function identity.guard_primary_subject_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_primary = true and new.deleted_at is not null then
    if not exists (
      select 1 from identity.subjects
      where user_id = old.user_id
        and is_primary = false
        and deleted_at is null
        and id <> old.id
    ) then
      raise exception
        'Cannot remove primary subject when no other active subject exists. '
        'Promote another subject first.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_primary_subject_soft_delete on identity.subjects;
create trigger trg_guard_primary_subject_soft_delete
before update on identity.subjects
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute function identity.guard_primary_subject_soft_delete();

-- =========================================================
-- H5: Add FK constraints for dangling narrative_artifact_id fields
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'soulmate_narrative_artifact_fkey'
  ) then
    alter table astro_artifacts.user_soulmate_artifacts
      add constraint soulmate_narrative_artifact_fkey
      foreign key (narrative_artifact_id)
      references astro_artifacts.report_artifacts (id)
      on delete set null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'past_life_narrative_artifact_fkey'
  ) then
    alter table astro_artifacts.user_past_life_artifacts
      add constraint past_life_narrative_artifact_fkey
      foreign key (narrative_artifact_id)
      references astro_artifacts.report_artifacts (id)
      on delete set null;
  end if;
end$$;

-- =========================================================
-- H6: Drop is_active from retrograde_periods — compute at query time
--     Prevents drift when cron fails to update the flag
-- =========================================================

alter table astro_core.retrograde_periods
  drop column if exists is_active;

-- Replace with a time-range index for efficient active-period lookups
create index if not exists idx_retrograde_periods_time_range
on astro_core.retrograde_periods (planet, starts_at, ends_at);

comment on table astro_core.retrograde_periods
  is 'Active periods are determined at query time: WHERE now() BETWEEN starts_at AND ends_at. Do not add a mutable is_active flag.';

-- =========================================================
-- H7: Enforce canonical sign ordering in compatibility_facts
--     Prevents asymmetric duplicates and inconsistent query results
-- =========================================================

-- Fix any existing rows that violate ordering (swap sign_a/sign_b)
update astro_core.compatibility_facts
set sign_a = sign_b, sign_b = sign_a
where sign_a > sign_b;

-- Remove any true duplicates that may have existed after swap
delete from astro_core.compatibility_facts c1
using astro_core.compatibility_facts c2
where c1.id > c2.id
  and c1.system_type = c2.system_type
  and c1.sign_a = c2.sign_a
  and c1.sign_b = c2.sign_b
  and c1.contract_version = c2.contract_version;

alter table astro_core.compatibility_facts
  drop constraint if exists compatibility_facts_sign_order_chk;

alter table astro_core.compatibility_facts
  add constraint compatibility_facts_sign_order_chk
  check (sign_a <= sign_b);

comment on constraint compatibility_facts_sign_order_chk on astro_core.compatibility_facts
  is 'Canonical ordering enforced: sign_a <= sign_b alphabetically. Always normalize both signs before insert or lookup: sign_a = least(s1, s2), sign_b = greatest(s1, s2).';

-- =========================================================
-- H8: Add CHECK constraint on resolved_interpretations.target_table
-- =========================================================

alter table interpretation.resolved_interpretations
  drop constraint if exists resolved_interpretations_target_table_chk;

alter table interpretation.resolved_interpretations
  add constraint resolved_interpretations_target_table_chk
  check (target_table in (
    'astro_artifacts.daily_horoscope_artifacts',
    'astro_artifacts.daily_category_horoscope_artifacts',
    'astro_artifacts.daily_readings_artifacts',
    'astro_artifacts.user_transit_artifacts',
    'astro_artifacts.user_biorhythm_artifacts',
    'astro_artifacts.user_tarot_draw_artifacts',
    'astro_artifacts.user_palm_reading_artifacts',
    'astro_artifacts.user_soulmate_artifacts',
    'astro_artifacts.user_past_life_artifacts',
    'astro_artifacts.astrocartography_artifacts',
    'astro_artifacts.report_artifacts',
    'astro_artifacts.story_articles',
    'astro_core.chart_snapshots',
    'astro_core.transit_facts_daily',
    'astro_core.retrograde_periods',
    'astro_core.moon_facts_daily',
    'astro_core.compatibility_facts',
    'astro_core.numerology_daily_facts'
  ));

-- =========================================================
-- H9: Add structured provenance column to chat_messages
--     Satisfies PLAN.md requirement for AI reply auditability
-- =========================================================

alter table chat.chat_messages
  add column if not exists provenance jsonb not null default '{}'::jsonb;

comment on column chat.chat_messages.provenance
  is 'Required for AI (advisor) replies. Schema: {subject_id: uuid, subject_version: int, prompt_template_id: uuid|null, referenced_artifact_ids: uuid[], model_settings: {model, temperature, max_tokens}, moderation_result: {flagged: bool, categories: []}}. Empty for human messages.';

-- =========================================================
-- M1: Missing index on chart_snapshots (subject_id, computed_at)
-- =========================================================

create index if not exists idx_chart_snapshots_subject_computed
on astro_core.chart_snapshots (subject_id, computed_at desc);

-- =========================================================
-- M2: Add alter default privileges for authenticated on all schemas
--     Ensures future tables are auto-accessible without manual grants
-- =========================================================

alter default privileges in schema astro_core
  grant select on tables to authenticated;

alter default privileges in schema astro_artifacts
  grant select on tables to authenticated;

alter default privileges in schema interpretation
  grant select on tables to authenticated;

alter default privileges in schema chat
  grant select on tables to authenticated;

-- =========================================================
-- M4: Partial unique index on active entitlements
--     Prevents multiple open entitlements per user+feature
-- =========================================================

create unique index if not exists uq_entitlements_active_per_user_feature
on billing.entitlements (user_id, feature_key)
where effective_to is null;

-- =========================================================
-- M6: Update consume_provider_credits to also write usage_events
--     Creates an auditable record of credit consumption per feature
-- =========================================================

create or replace function platform.consume_provider_credits(
  p_feature_key      text,
  p_credits          int  default 1,
  p_global_daily_cap int  default 220,
  p_global_monthly_cap int default 7000,
  p_feature_daily_cap  int default null
)
returns table (
  allowed              boolean,
  reason               text,
  global_daily_used    bigint,
  global_monthly_used  bigint,
  feature_daily_used   bigint,
  global_daily_cap     int,
  global_monthly_cap   int,
  feature_daily_cap    int
)
language plpgsql
security definer
set search_path = platform, public
as $$
declare
  v_now         timestamptz := now();
  v_day_key     text := to_char((v_now at time zone 'UTC')::date, 'YYYY-MM-DD');
  v_month_key   text := to_char(date_trunc('month', v_now at time zone 'UTC'), 'YYYY-MM');
  v_scope_d     text := 'provider_credit_global_daily';
  v_scope_m     text := 'provider_credit_global_monthly';
  v_scope_fd    text := 'provider_credit_feature_daily';
  v_daily       bigint := 0;
  v_monthly     bigint := 0;
  v_feature_daily bigint := 0;
  v_trace_id    text := gen_random_uuid()::text;
begin
  if p_feature_key is null or btrim(p_feature_key) = '' then
    return query select false, 'feature_key_required'::text,
      0::bigint, 0::bigint, 0::bigint,
      p_global_daily_cap, p_global_monthly_cap, p_feature_daily_cap;
    return;
  end if;

  if p_credits <= 0 then
    return query select false, 'credits_must_be_positive'::text,
      0::bigint, 0::bigint, 0::bigint,
      p_global_daily_cap, p_global_monthly_cap, p_feature_daily_cap;
    return;
  end if;

  -- Ensure counter rows exist
  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_day_key,   v_scope_d,  null, null, null,          0) on conflict do nothing;
  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_month_key, v_scope_m,  null, null, null,          0) on conflict do nothing;
  insert into platform.usage_counters (window_key, scope, user_id, ip_hash, feature_key, counter)
  values (v_day_key,   v_scope_fd, null, null, p_feature_key, 0) on conflict do nothing;

  -- Lock and read current counts
  select counter into v_daily from platform.usage_counters
  where window_key = v_day_key and scope = v_scope_d
    and user_id is null and ip_hash is null and feature_key is null
  for update;

  select counter into v_monthly from platform.usage_counters
  where window_key = v_month_key and scope = v_scope_m
    and user_id is null and ip_hash is null and feature_key is null
  for update;

  select counter into v_feature_daily from platform.usage_counters
  where window_key = v_day_key and scope = v_scope_fd
    and user_id is null and ip_hash is null and feature_key = p_feature_key
  for update;

  -- Cap checks
  if p_global_daily_cap is not null and v_daily + p_credits > p_global_daily_cap then
    return query select false, 'global_daily_cap_exceeded'::text,
      v_daily, v_monthly, v_feature_daily,
      p_global_daily_cap, p_global_monthly_cap, p_feature_daily_cap;
    return;
  end if;

  if p_global_monthly_cap is not null and v_monthly + p_credits > p_global_monthly_cap then
    return query select false, 'global_monthly_cap_exceeded'::text,
      v_daily, v_monthly, v_feature_daily,
      p_global_daily_cap, p_global_monthly_cap, p_feature_daily_cap;
    return;
  end if;

  if p_feature_daily_cap is not null and v_feature_daily + p_credits > p_feature_daily_cap then
    return query select false, 'feature_daily_cap_exceeded'::text,
      v_daily, v_monthly, v_feature_daily,
      p_global_daily_cap, p_global_monthly_cap, p_feature_daily_cap;
    return;
  end if;

  -- Increment counters
  update platform.usage_counters
  set counter = counter + p_credits, updated_at = now()
  where window_key = v_day_key and scope = v_scope_d
    and user_id is null and ip_hash is null and feature_key is null;

  update platform.usage_counters
  set counter = counter + p_credits, updated_at = now()
  where window_key = v_month_key and scope = v_scope_m
    and user_id is null and ip_hash is null and feature_key is null;

  update platform.usage_counters
  set counter = counter + p_credits, updated_at = now()
  where window_key = v_day_key and scope = v_scope_fd
    and user_id is null and ip_hash is null and feature_key = p_feature_key;

  -- Audit trail: write a usage_event row for each credit consumption
  insert into platform.usage_events (
    user_id, subject_id, ip_hash,
    feature_key, action, units,
    trace_id, meta
  ) values (
    null, null, 'internal',
    p_feature_key, 'provider_credit_consumed', p_credits,
    v_trace_id,
    jsonb_build_object(
      'day_key',        v_day_key,
      'global_daily_after',   v_daily + p_credits,
      'global_monthly_after', v_monthly + p_credits,
      'feature_daily_after',  v_feature_daily + p_credits
    )
  );

  return query select true, 'allowed'::text,
    v_daily + p_credits, v_monthly + p_credits, v_feature_daily + p_credits,
    p_global_daily_cap, p_global_monthly_cap, p_feature_daily_cap;
end;
$$;

revoke all on function platform.consume_provider_credits(text, int, int, int, int) from public;
grant execute on function platform.consume_provider_credits(text, int, int, int, int) to service_role;

-- =========================================================
-- M9: Add sign/range constraint to billing.credit_transactions.amount
-- =========================================================

alter table billing.credit_transactions
  drop constraint if exists credit_transactions_amount_sign_chk;

alter table billing.credit_transactions
  add constraint credit_transactions_amount_sign_chk
  check (
    (tx_type in ('purchase', 'bonus', 'refund') and amount > 0) or
    (tx_type in ('session_charge', 'expiration')  and amount < 0) or
    (tx_type = 'adjustment'                        and amount <> 0)
  );

-- =========================================================
-- M10: Add billing_interval_count to plan_price_versions unique index
--      Prevents ambiguity between monthly and multi-month prices
-- =========================================================

drop index if exists billing.uq_plan_price_versions_active_open;

create unique index if not exists uq_plan_price_versions_active_open
on billing.plan_price_versions (plan_code, currency, billing_interval, billing_interval_count)
where is_active = true and effective_to is null;

-- =========================================================
-- L4: Add unique constraint to magic_ball_answer_pool
--     Prevents duplicate answers on seed reruns
-- =========================================================

create unique index if not exists uq_magic_ball_answer_locale
on astro_artifacts.magic_ball_answer_pool (answer, locale);

-- =========================================================
-- L6: Document system_prompt as sensitive (column-level RLS not supported)
--     BFF routes must never SELECT system_prompt for authenticated users
-- =========================================================

comment on column chat.advisors.system_prompt
  is 'SENSITIVE — AI persona instructions. Never include in public or authenticated BFF responses. Query explicitly by column name only in service_role contexts. Never use SELECT * on this table in user-facing routes.';

-- =========================================================
-- Grant new columns/tables to relevant roles
-- =========================================================

-- plan_catalog and plan_price_versions already granted in migration 10
-- New billing.subscriptions policy change above is sufficient for authenticated

-- Ensure authenticated can read new astro_core tables from future migrations
-- (alter default privileges above handles this going forward)

-- Explicitly grant authenticated read on identity.subjects new columns
-- (columns inherit existing table grant — no extra grant needed)

commit;
