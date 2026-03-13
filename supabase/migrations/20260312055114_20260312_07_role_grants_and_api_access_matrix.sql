begin;

-- =========================================================
-- Schema-level lock down
-- =========================================================

revoke all on schema identity from public;
revoke all on schema billing from public;
revoke all on schema platform from public;
revoke all on schema provider_ingestion from public;
revoke all on schema astro_core from public;
revoke all on schema astro_artifacts from public;
revoke all on schema interpretation from public;
revoke all on schema chat from public;

-- =========================================================
-- service_role gets full backend capability
-- =========================================================

grant usage on schema identity to service_role;
grant usage on schema billing to service_role;
grant usage on schema platform to service_role;
grant usage on schema provider_ingestion to service_role;
grant usage on schema astro_core to service_role;
grant usage on schema astro_artifacts to service_role;
grant usage on schema interpretation to service_role;
grant usage on schema chat to service_role;

grant all privileges on all tables in schema identity to service_role;
grant all privileges on all tables in schema billing to service_role;
grant all privileges on all tables in schema platform to service_role;
grant all privileges on all tables in schema provider_ingestion to service_role;
grant all privileges on all tables in schema astro_core to service_role;
grant all privileges on all tables in schema astro_artifacts to service_role;
grant all privileges on all tables in schema interpretation to service_role;
grant all privileges on all tables in schema chat to service_role;

grant all privileges on all sequences in schema identity to service_role;
grant all privileges on all sequences in schema billing to service_role;
grant all privileges on all sequences in schema platform to service_role;
grant all privileges on all sequences in schema provider_ingestion to service_role;
grant all privileges on all sequences in schema astro_core to service_role;
grant all privileges on all sequences in schema astro_artifacts to service_role;
grant all privileges on all sequences in schema interpretation to service_role;
grant all privileges on all sequences in schema chat to service_role;

alter default privileges in schema identity
grant all privileges on tables to service_role;
alter default privileges in schema billing
grant all privileges on tables to service_role;
alter default privileges in schema platform
grant all privileges on tables to service_role;
alter default privileges in schema provider_ingestion
grant all privileges on tables to service_role;
alter default privileges in schema astro_core
grant all privileges on tables to service_role;
alter default privileges in schema astro_artifacts
grant all privileges on tables to service_role;
alter default privileges in schema interpretation
grant all privileges on tables to service_role;
alter default privileges in schema chat
grant all privileges on tables to service_role;

alter default privileges in schema identity
grant all privileges on sequences to service_role;
alter default privileges in schema billing
grant all privileges on sequences to service_role;
alter default privileges in schema platform
grant all privileges on sequences to service_role;
alter default privileges in schema provider_ingestion
grant all privileges on sequences to service_role;
alter default privileges in schema astro_core
grant all privileges on sequences to service_role;
alter default privileges in schema astro_artifacts
grant all privileges on sequences to service_role;
alter default privileges in schema interpretation
grant all privileges on sequences to service_role;
alter default privileges in schema chat
grant all privileges on sequences to service_role;

-- =========================================================
-- authenticated: controlled product access
-- =========================================================

grant usage on schema identity to authenticated;
grant usage on schema billing to authenticated;
grant usage on schema platform to authenticated;
grant usage on schema astro_core to authenticated;
grant usage on schema astro_artifacts to authenticated;
grant usage on schema interpretation to authenticated;
grant usage on schema chat to authenticated;

revoke all privileges on all tables in schema identity from authenticated;
revoke all privileges on all tables in schema billing from authenticated;
revoke all privileges on all tables in schema platform from authenticated;
revoke all privileges on all tables in schema astro_core from authenticated;
revoke all privileges on all tables in schema astro_artifacts from authenticated;
revoke all privileges on all tables in schema interpretation from authenticated;
revoke all privileges on all tables in schema chat from authenticated;
revoke all privileges on all tables in schema provider_ingestion from authenticated;

grant select, insert, update, delete
on table identity.profiles
to authenticated;

grant select, insert, update, delete
on table identity.subjects
to authenticated;

grant select
on table billing.subscriptions,
         billing.payments,
         billing.credit_transactions,
         billing.entitlements
to authenticated;

grant select
on table platform.feature_computations,
         platform.usage_events,
         platform.analytics_events
to authenticated;

grant select
on all tables in schema astro_core
to authenticated;

grant select
on all tables in schema astro_artifacts
to authenticated;

grant select
on table interpretation.interpretation_templates,
         interpretation.interpretation_rules,
         interpretation.resolved_interpretations,
         interpretation.interpretation_runs
to authenticated;

grant select
on table chat.advisors,
         chat.advisor_report_products,
         chat.chat_sessions,
         chat.chat_messages
to authenticated;

-- =========================================================
-- anon: public read-only content
-- =========================================================

grant usage on schema astro_core to anon;
grant usage on schema astro_artifacts to anon;
grant usage on schema chat to anon;

revoke all privileges on all tables in schema astro_core from anon;
revoke all privileges on all tables in schema astro_artifacts from anon;
revoke all privileges on all tables in schema chat from anon;
revoke all privileges on all tables in schema identity from anon;
revoke all privileges on all tables in schema billing from anon;
revoke all privileges on all tables in schema platform from anon;
revoke all privileges on all tables in schema provider_ingestion from anon;
revoke all privileges on all tables in schema interpretation from anon;

grant select
on table astro_core.moon_facts_daily,
         astro_core.moon_events,
         astro_core.transit_facts_daily,
         astro_core.retrograde_periods,
         astro_core.astro_event_facts,
         astro_core.compatibility_facts
to anon;

grant select
on table astro_artifacts.tarot_cards,
         astro_artifacts.magic_ball_answer_pool,
         astro_artifacts.daily_horoscope_artifacts,
         astro_artifacts.daily_category_horoscope_artifacts,
         astro_artifacts.daily_readings_artifacts,
         astro_artifacts.story_categories,
         astro_artifacts.story_articles,
         astro_artifacts.story_sections
to anon;

grant select
on table chat.advisors,
         chat.advisor_report_products
to anon;

commit;
