begin;

-- =========================================================
-- Complete RLS coverage for remaining tables
-- =========================================================

alter table astro_artifacts.report_sections enable row level security;

alter table interpretation.resolved_interpretations enable row level security;
alter table interpretation.interpretation_runs enable row level security;

alter table platform.idempotency_keys enable row level security;
alter table platform.feature_flags enable row level security;
alter table platform.feature_jobs enable row level security;
alter table platform.dead_letter_jobs enable row level security;
alter table platform.moderation_events enable row level security;
alter table platform.incident_pins enable row level security;
alter table platform.webhook_events enable row level security;
alter table platform.usage_counters enable row level security;

alter table provider_ingestion.provider_registry enable row level security;
alter table provider_ingestion.provider_feature_map enable row level security;
alter table provider_ingestion.provider_requests enable row level security;
alter table provider_ingestion.provider_payload_snapshots enable row level security;
alter table provider_ingestion.provider_payload_pins enable row level security;

-- =========================================================
-- Tighten report artifact policies
-- =========================================================

drop policy if exists "report_artifacts_select_own_or_global"
on astro_artifacts.report_artifacts;

drop policy if exists "report_artifacts_insert_own_or_global"
on astro_artifacts.report_artifacts;

drop policy if exists "report_artifacts_update_own_or_global"
on astro_artifacts.report_artifacts;

create policy "report_artifacts_select_own_or_global"
on astro_artifacts.report_artifacts
for select
using (user_id is null or auth.uid() = user_id);

create policy "report_artifacts_insert_own_only"
on astro_artifacts.report_artifacts
for insert
with check (auth.uid() = user_id);

create policy "report_artifacts_update_own_only"
on astro_artifacts.report_artifacts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "report_artifacts_delete_own_only"
on astro_artifacts.report_artifacts
for delete
using (auth.uid() = user_id);

-- =========================================================
-- report_sections inherits access from parent report artifact
-- =========================================================

create policy "report_sections_select_by_parent_access"
on astro_artifacts.report_sections
for select
using (
  exists (
    select 1
    from astro_artifacts.report_artifacts ra
    where ra.id = report_sections.report_artifact_id
      and (ra.user_id is null or ra.user_id = auth.uid())
  )
);

create policy "report_sections_insert_for_owned_parent_only"
on astro_artifacts.report_sections
for insert
with check (
  exists (
    select 1
    from astro_artifacts.report_artifacts ra
    where ra.id = report_sections.report_artifact_id
      and ra.user_id = auth.uid()
  )
);

create policy "report_sections_update_for_owned_parent_only"
on astro_artifacts.report_sections
for update
using (
  exists (
    select 1
    from astro_artifacts.report_artifacts ra
    where ra.id = report_sections.report_artifact_id
      and ra.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from astro_artifacts.report_artifacts ra
    where ra.id = report_sections.report_artifact_id
      and ra.user_id = auth.uid()
  )
);

create policy "report_sections_delete_for_owned_parent_only"
on astro_artifacts.report_sections
for delete
using (
  exists (
    select 1
    from astro_artifacts.report_artifacts ra
    where ra.id = report_sections.report_artifact_id
      and ra.user_id = auth.uid()
  )
);

-- =========================================================
-- interpretation tables: user can read own, service role writes
-- =========================================================

create policy "resolved_interpretations_select_own"
on interpretation.resolved_interpretations
for select
using (
  exists (
    select 1
    from platform.feature_computations fc
    where fc.id = resolved_interpretations.feature_computation_id
      and fc.user_id = auth.uid()
  )
);

create policy "interpretation_runs_select_own"
on interpretation.interpretation_runs
for select
using (
  exists (
    select 1
    from platform.feature_computations fc
    where fc.id = interpretation_runs.feature_computation_id
      and fc.user_id = auth.uid()
  )
);

create policy "resolved_interpretations_service_all"
on interpretation.resolved_interpretations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "interpretation_runs_service_all"
on interpretation.interpretation_runs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =========================================================
-- service-only ops/raw tables
-- =========================================================

create policy "idempotency_keys_service_all"
on platform.idempotency_keys
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "feature_flags_service_all"
on platform.feature_flags
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "feature_jobs_service_all"
on platform.feature_jobs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "dead_letter_jobs_service_all"
on platform.dead_letter_jobs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "moderation_events_service_all"
on platform.moderation_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "incident_pins_service_all"
on platform.incident_pins
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "webhook_events_service_all"
on platform.webhook_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "usage_counters_service_all"
on platform.usage_counters
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "provider_registry_service_all"
on provider_ingestion.provider_registry
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "provider_feature_map_service_all"
on provider_ingestion.provider_feature_map
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "provider_requests_service_all"
on provider_ingestion.provider_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "provider_payload_snapshots_service_all"
on provider_ingestion.provider_payload_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "provider_payload_pins_service_all"
on provider_ingestion.provider_payload_pins
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;
