begin;

-- =========================================================
-- astro_artifacts (feature outputs)
-- =========================================================

create table if not exists astro_artifacts.tarot_cards (
  id text primary key,
  name text not null,
  number int not null,
  arcana text not null check (arcana in ('major','minor')),
  suit text null,
  upright_meaning text not null,
  reversed_meaning text not null,
  tip_of_day text null,
  image_slug text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tarot_cards_updated_at
before update on astro_artifacts.tarot_cards
for each row execute function platform.set_updated_at();

create table if not exists astro_artifacts.magic_ball_answer_pool (
  id uuid primary key default gen_random_uuid(),
  answer text not null,
  sentiment text not null check (sentiment in ('positive','neutral','negative')),
  weight int not null default 1 check (weight > 0),
  locale text not null default 'en',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists astro_artifacts.report_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete cascade,
  subject_id uuid null references identity.subjects (id) on delete cascade,
  artifact_type text not null,
  title text not null,
  subtitle text null,
  data_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','archived','draft')),
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_artifacts_user_created
on astro_artifacts.report_artifacts (user_id, created_at desc);

create index if not exists idx_report_artifacts_type_created
on astro_artifacts.report_artifacts (artifact_type, created_at desc);

create trigger trg_report_artifacts_updated_at
before update on astro_artifacts.report_artifacts
for each row execute function platform.set_updated_at();

create table if not exists astro_artifacts.report_sections (
  id uuid primary key default gen_random_uuid(),
  report_artifact_id uuid not null references astro_artifacts.report_artifacts (id) on delete cascade,
  section_order int not null,
  heading text not null,
  body text not null,
  bullets jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_artifact_id, section_order)
);

create table if not exists astro_artifacts.daily_horoscope_artifacts (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  system_type text not null default 'western',
  sign text not null,
  title text not null,
  text text not null,
  energy int null check (energy between 0 and 100),
  emotional_tone text null,
  challenges jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fact_date, system_type, sign, contract_version)
);

create table if not exists astro_artifacts.daily_category_horoscope_artifacts (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  system_type text not null default 'western',
  sign text not null,
  category text not null check (category in ('your-day','love','health','career')),
  text text not null,
  rating int null check (rating between 1 and 5),
  keywords jsonb not null default '[]'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fact_date, system_type, sign, category, contract_version)
);

create table if not exists astro_artifacts.daily_readings_artifacts (
  id uuid primary key default gen_random_uuid(),
  fact_date date not null,
  tarot_card_id text not null references astro_artifacts.tarot_cards (id) on delete restrict,
  lucky_number int null,
  lucky_number_explanation text null,
  love_tip text null,
  love_detail text null,
  dos jsonb not null default '[]'::jsonb,
  donts jsonb not null default '[]'::jsonb,
  trending_question text null,
  magic_ball_pool_version text not null default 'v1',
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (fact_date, contract_version)
);

create table if not exists astro_artifacts.user_transit_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  fact_date date not null,
  system_type text not null default 'western',
  short_term jsonb not null default '[]'::jsonb,
  long_term jsonb not null default '[]'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, subject_id, fact_date, system_type, contract_version)
);

create table if not exists astro_artifacts.user_biorhythm_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  fact_date date not null,
  physical_pct int not null check (physical_pct between 0 and 100),
  emotional_pct int not null check (emotional_pct between 0 and 100),
  intellectual_pct int not null check (intellectual_pct between 0 and 100),
  interpretation jsonb not null default '{}'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (user_id, subject_id, fact_date, contract_version)
);

create table if not exists astro_artifacts.user_tarot_draw_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  draw_date date not null,
  draw_type text not null check (draw_type in ('card_of_day','near_future','love','yes_no')),
  card_ids jsonb not null default '[]'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  locked_until timestamptz null,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  contract_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (user_id, subject_id, draw_type, draw_date)
);

create table if not exists astro_artifacts.user_palm_reading_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid null references identity.subjects (id) on delete set null,
  hand_side text not null default 'left' check (hand_side in ('left','right','both')),
  image_path text null,
  line_scores jsonb not null default '{}'::jsonb,
  line_suggestions jsonb not null default '{}'::jsonb,
  insights jsonb not null default '{}'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_palm_reading_artifacts_updated_at
before update on astro_artifacts.user_palm_reading_artifacts
for each row execute function platform.set_updated_at();

create table if not exists astro_artifacts.user_soulmate_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  match_profile jsonb not null default '{}'::jsonb,
  image_url text null,
  narrative_artifact_id uuid null,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists astro_artifacts.astrocartography_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  lines_json jsonb not null default '[]'::jsonb,
  places_json jsonb not null default '[]'::jsonb,
  map_meta jsonb not null default '{}'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  source_provider_id uuid null references provider_ingestion.provider_registry (id) on delete set null,
  mapper_version text not null default 'v1',
  contract_version text not null default 'v1',
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  freshness_status text not null default 'fresh' check (freshness_status in ('fresh','stale','expired')),
  provider_meta jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists astro_artifacts.user_past_life_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references identity.subjects (id) on delete cascade,
  narrative_artifact_id uuid null,
  payload jsonb not null default '{}'::jsonb,
  computation_id uuid null references platform.feature_computations (id) on delete set null,
  contract_version text not null default 'v1',
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create table if not exists astro_artifacts.story_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text null,
  accent text null,
  image_url text null,
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_story_categories_updated_at
before update on astro_artifacts.story_categories
for each row execute function platform.set_updated_at();

create table if not exists astro_artifacts.story_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references astro_artifacts.story_categories (id) on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text null,
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz null,
  content_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_story_articles_updated_at
before update on astro_artifacts.story_articles
for each row execute function platform.set_updated_at();

create table if not exists astro_artifacts.story_sections (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references astro_artifacts.story_articles (id) on delete cascade,
  section_order int not null,
  heading text not null,
  body text not null,
  bullets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (article_id, section_order)
);

-- =========================================================
-- interpretation
-- =========================================================

create table if not exists interpretation.interpretation_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  system_type text not null default 'western',
  locale text not null default 'en',
  version text not null default 'v1',
  template_text text not null,
  variables_schema jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, system_type, locale, version)
);

create trigger trg_interpretation_templates_updated_at
before update on interpretation.interpretation_templates
for each row execute function platform.set_updated_at();

create table if not exists interpretation.interpretation_rules (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  system_type text not null default 'western',
  locale text not null default 'en',
  precedence jsonb not null default '["internal_template","provider_text","fallback"]'::jsonb,
  allow_provider_text boolean not null default true,
  rule_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_interpretation_rules_updated_at
before update on interpretation.interpretation_rules
for each row execute function platform.set_updated_at();

create table if not exists interpretation.resolved_interpretations (
  id uuid primary key default gen_random_uuid(),
  feature_computation_id uuid not null references platform.feature_computations (id) on delete cascade,
  target_table text not null,
  target_id uuid not null,
  resolution_source text not null check (resolution_source in ('internal_template','provider_text','fallback','hybrid')),
  template_id uuid null references interpretation.interpretation_templates (id) on delete set null,
  resolved_json jsonb not null default '{}'::jsonb,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists interpretation.interpretation_runs (
  id uuid primary key default gen_random_uuid(),
  feature_computation_id uuid not null references platform.feature_computations (id) on delete cascade,
  rule_id uuid null references interpretation.interpretation_rules (id) on delete set null,
  template_id uuid null references interpretation.interpretation_templates (id) on delete set null,
  status text not null check (status in ('running','success','failed')),
  input_facts jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_interpretation_runs_updated_at
before update on interpretation.interpretation_runs
for each row execute function platform.set_updated_at();

-- =========================================================
-- chat
-- =========================================================

create table if not exists chat.advisors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  specialty text not null,
  specialty_icon text null,
  tagline text null,
  bio text null,
  zodiac_sign text null,
  years_of_experience int null,
  skills jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  rate_per_minute numeric(12,2) not null default 0,
  rating numeric(4,2) not null default 0,
  review_count int not null default 0,
  is_online boolean not null default false,
  response_time text null,
  total_sessions int not null default 0,
  avatar_url text null,
  system_prompt text null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_advisors_updated_at
before update on chat.advisors
for each row execute function platform.set_updated_at();

create table if not exists chat.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid null references identity.subjects (id) on delete set null,
  advisor_id uuid not null references chat.advisors (id) on delete restrict,
  status text not null default 'active' check (status in ('active','ended','pending')),
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  total_minutes numeric(12,3) null,
  cost_charged numeric(12,2) null,
  currency text not null default 'INR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_chat_sessions_updated_at
before update on chat.chat_sessions
for each row execute function platform.set_updated_at();

create table if not exists chat.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat.chat_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  advisor_id uuid not null references chat.advisors (id) on delete restrict,
  role text not null check (role in ('user','advisor','system')),
  content text not null,
  token_usage jsonb not null default '{}'::jsonb,
  tarot_card_data jsonb not null default '{}'::jsonb,
  model text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists chat.advisor_report_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  teaser text null,
  price_inr numeric(12,2) null,
  status text not null default 'buy' check (status in ('buy','owned','gift')),
  badge text null,
  icon_url text null,
  accent text null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_advisor_report_products_updated_at
before update on chat.advisor_report_products
for each row execute function platform.set_updated_at();

commit;
