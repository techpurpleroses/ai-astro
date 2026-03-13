begin;

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists idx_moon_events_date
on astro_core.moon_events (event_date, event_at);

create index if not exists idx_transit_facts_daily_date
on astro_core.transit_facts_daily (fact_date desc, duration_class);

create index if not exists idx_retrograde_periods_active
on astro_core.retrograde_periods (is_active, starts_at, ends_at);

create index if not exists idx_astro_event_facts_date
on astro_core.astro_event_facts (event_date desc, significance);

create index if not exists idx_compatibility_facts_sign_a
on astro_core.compatibility_facts (system_type, sign_a, overall desc);

create index if not exists idx_numerology_profile_user
on astro_core.numerology_profile_facts (user_id, computed_at desc);

create index if not exists idx_numerology_daily_user_date
on astro_core.numerology_daily_facts (user_id, fact_date desc);

create index if not exists idx_daily_horoscope_lookup
on astro_artifacts.daily_horoscope_artifacts (fact_date desc, sign, system_type);

create index if not exists idx_daily_category_horoscope_lookup
on astro_artifacts.daily_category_horoscope_artifacts (fact_date desc, sign, category);

create index if not exists idx_user_transit_artifacts_user_date
on astro_artifacts.user_transit_artifacts (user_id, fact_date desc);

create index if not exists idx_user_biorhythm_artifacts_user_date
on astro_artifacts.user_biorhythm_artifacts (user_id, fact_date desc);

create index if not exists idx_user_tarot_draw_artifacts_user_created
on astro_artifacts.user_tarot_draw_artifacts (user_id, created_at desc);

create index if not exists idx_user_palm_reading_artifacts_user_created
on astro_artifacts.user_palm_reading_artifacts (user_id, created_at desc);

create index if not exists idx_user_soulmate_artifacts_user_created
on astro_artifacts.user_soulmate_artifacts (user_id, created_at desc);

create index if not exists idx_astrocartography_artifacts_user_created
on astro_artifacts.astrocartography_artifacts (user_id, created_at desc);

create index if not exists idx_user_past_life_artifacts_user_created
on astro_artifacts.user_past_life_artifacts (user_id, created_at desc);

create index if not exists idx_story_articles_category
on astro_artifacts.story_articles (category_id, status, published_at desc);

create index if not exists idx_chat_sessions_user_started
on chat.chat_sessions (user_id, started_at desc);

create index if not exists idx_chat_messages_session_created
on chat.chat_messages (session_id, created_at);

create index if not exists idx_resolved_interpretations_target
on interpretation.resolved_interpretations (target_table, target_id);

create index if not exists idx_interpretation_rules_lookup
on interpretation.interpretation_rules (feature_key, system_type, locale, is_active);

-- =========================================================
-- RLS: user-owned tables
-- =========================================================

alter table astro_core.chart_snapshots enable row level security;
alter table astro_core.numerology_profile_facts enable row level security;
alter table astro_core.numerology_daily_facts enable row level security;

alter table astro_artifacts.user_transit_artifacts enable row level security;
alter table astro_artifacts.user_biorhythm_artifacts enable row level security;
alter table astro_artifacts.user_tarot_draw_artifacts enable row level security;
alter table astro_artifacts.user_palm_reading_artifacts enable row level security;
alter table astro_artifacts.user_soulmate_artifacts enable row level security;
alter table astro_artifacts.astrocartography_artifacts enable row level security;
alter table astro_artifacts.user_past_life_artifacts enable row level security;
alter table astro_artifacts.report_artifacts enable row level security;

alter table chat.chat_sessions enable row level security;
alter table chat.chat_messages enable row level security;

create policy "chart_snapshots_all_own"
on astro_core.chart_snapshots
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "numerology_profile_all_own"
on astro_core.numerology_profile_facts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "numerology_daily_all_own"
on astro_core.numerology_daily_facts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_transit_artifacts_all_own"
on astro_artifacts.user_transit_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_biorhythm_artifacts_all_own"
on astro_artifacts.user_biorhythm_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_tarot_draw_artifacts_all_own"
on astro_artifacts.user_tarot_draw_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_palm_reading_artifacts_all_own"
on astro_artifacts.user_palm_reading_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_soulmate_artifacts_all_own"
on astro_artifacts.user_soulmate_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "astrocartography_artifacts_all_own"
on astro_artifacts.astrocartography_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_past_life_artifacts_all_own"
on astro_artifacts.user_past_life_artifacts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "report_artifacts_select_own_or_global"
on astro_artifacts.report_artifacts
for select
using (user_id is null or auth.uid() = user_id);

create policy "report_artifacts_insert_own_or_global"
on astro_artifacts.report_artifacts
for insert
with check (user_id is null or auth.uid() = user_id);

create policy "report_artifacts_update_own_or_global"
on astro_artifacts.report_artifacts
for update
using (user_id is null or auth.uid() = user_id)
with check (user_id is null or auth.uid() = user_id);

create policy "chat_sessions_all_own"
on chat.chat_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat_messages_all_own"
on chat.chat_messages
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================================
-- RLS: globally readable reference/common tables
-- =========================================================

alter table astro_core.moon_facts_daily enable row level security;
alter table astro_core.moon_events enable row level security;
alter table astro_core.transit_facts_daily enable row level security;
alter table astro_core.retrograde_periods enable row level security;
alter table astro_core.astro_event_facts enable row level security;
alter table astro_core.compatibility_facts enable row level security;

alter table astro_artifacts.tarot_cards enable row level security;
alter table astro_artifacts.magic_ball_answer_pool enable row level security;
alter table astro_artifacts.daily_horoscope_artifacts enable row level security;
alter table astro_artifacts.daily_category_horoscope_artifacts enable row level security;
alter table astro_artifacts.daily_readings_artifacts enable row level security;
alter table astro_artifacts.story_categories enable row level security;
alter table astro_artifacts.story_articles enable row level security;
alter table astro_artifacts.story_sections enable row level security;

alter table chat.advisors enable row level security;
alter table chat.advisor_report_products enable row level security;

alter table interpretation.interpretation_templates enable row level security;
alter table interpretation.interpretation_rules enable row level security;

create policy "moon_facts_daily_read_all"
on astro_core.moon_facts_daily for select using (true);

create policy "moon_events_read_all"
on astro_core.moon_events for select using (true);

create policy "transit_facts_daily_read_all"
on astro_core.transit_facts_daily for select using (true);

create policy "retrograde_periods_read_all"
on astro_core.retrograde_periods for select using (true);

create policy "astro_event_facts_read_all"
on astro_core.astro_event_facts for select using (true);

create policy "compatibility_facts_read_all"
on astro_core.compatibility_facts for select using (true);

create policy "tarot_cards_read_all"
on astro_artifacts.tarot_cards for select using (true);

create policy "magic_ball_answer_pool_read_all"
on astro_artifacts.magic_ball_answer_pool for select using (true);

create policy "daily_horoscope_artifacts_read_all"
on astro_artifacts.daily_horoscope_artifacts for select using (true);

create policy "daily_category_horoscope_artifacts_read_all"
on astro_artifacts.daily_category_horoscope_artifacts for select using (true);

create policy "daily_readings_artifacts_read_all"
on astro_artifacts.daily_readings_artifacts for select using (true);

create policy "story_categories_read_all"
on astro_artifacts.story_categories for select using (true);

create policy "story_articles_read_all"
on astro_artifacts.story_articles for select using (true);

create policy "story_sections_read_all"
on astro_artifacts.story_sections for select using (true);

create policy "advisors_read_all"
on chat.advisors for select using (true);

create policy "advisor_report_products_read_all"
on chat.advisor_report_products for select using (true);

create policy "interpretation_templates_read_all"
on interpretation.interpretation_templates for select using (true);

create policy "interpretation_rules_read_all"
on interpretation.interpretation_rules for select using (true);

commit;
