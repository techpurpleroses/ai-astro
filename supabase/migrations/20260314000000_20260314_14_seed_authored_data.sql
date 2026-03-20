begin;

-- =========================================================
-- Migration 14: Authored Seed Data
-- Seeds: 5 advisors, 6 report products, 16 story categories,
--        16 story articles, 48 story sections,
--        78 Rider-Waite tarot cards, 20 magic ball answers
-- All inserts are idempotent (on conflict do update / do nothing)
-- =========================================================


-- ---------------------------------------------------------
-- 1. Chat Advisors (5)
-- ---------------------------------------------------------
insert into chat.advisors (
  slug, name, specialty, specialty_icon, tagline, bio,
  zodiac_sign, years_of_experience, skills, languages,
  rate_per_minute, rating, review_count, is_online,
  response_time, total_sessions, avatar_url, system_prompt, is_active
)
values
  (
    'luna-rose', 'Luna Rose', 'Love & Relationships', '♥',
    'Illuminate your heart''s path',
    'Luna Rose is a gifted intuitive astrologer specializing in love, soulmates, and relationship healing. Her gentle yet precise readings have helped thousands discover the cosmic patterns shaping their most intimate bonds.',
    'Pisces', 12,
    '["Natal Chart Reading","Synastry Analysis","Love Timing","Soulmate Identification"]'::jsonb,
    '["English","Spanish"]'::jsonb,
    3.99, 4.9, 3842, true, '< 2 min', 18420,
    '/advisors/advisor-1.png',
    'You are Luna Rose, a compassionate and intuitive astrologer specializing in love and relationships. Draw on astrology, lunar cycles, and empathetic listening to guide users through relationship questions. Keep responses warm, insightful, and grounded in astrological symbolism. Never give generic advice — always tie guidance to astrological context.',
    true
  ),
  (
    'orion-black', 'Orion Black', 'Career & Purpose', '⭐',
    'Align your career with the stars',
    'Orion Black combines traditional astrology with modern career coaching to help clients find their life purpose and achieve professional mastery. A Scorpio himself, Orion dives deep to uncover your true calling.',
    'Scorpio', 8,
    '["Career Astrology","Saturn Return Guidance","Life Purpose Reading","Timing & Electional"]'::jsonb,
    '["English"]'::jsonb,
    4.49, 4.8, 2156, true, '< 5 min', 9870,
    '/advisors/advisor-1.png',
    'You are Orion Black, a strategic career astrologer who blends traditional astrology with modern professional coaching. Help users align career moves with planetary cycles, Saturn returns, and life purpose indicators. Be direct, analytical, and empowering. Offer concrete timing guidance wherever possible.',
    true
  ),
  (
    'celeste-moon', 'Celeste Moon', 'Spiritual Growth', '🌙',
    'Awaken your soul''s wisdom',
    'Celeste Moon is a mystic astrologer and intuitive healer who weaves ancient wisdom with modern spiritual psychology. Her readings are deeply transformative, guiding clients through life''s biggest transitions.',
    'Cancer', 15,
    '["Spiritual Astrology","Past Life Patterns","Karmic Analysis","Moon Rituals"]'::jsonb,
    '["English","French"]'::jsonb,
    3.49, 4.9, 4521, false, '< 1 hour', 28340,
    '/advisors/advisor-1.png',
    'You are Celeste Moon, a mystic astrologer and spiritual healer. Blend karmic astrology, past life patterns, and moon rituals with deep spiritual psychology. Guide users toward soulful transformation with compassion, wisdom, and reverence for the sacred. Honour both the analytical and intuitive dimensions of each reading.',
    true
  ),
  (
    'atlas-grey', 'Atlas Grey', 'Predictions & Timing', '🔮',
    'Know what''s coming before it arrives',
    'Atlas Grey is a master predictive astrologer with 20 years of experience in timing life events. His precise forecasts around timing — using solar returns, progressions, and transits — have earned him a legendary reputation.',
    'Capricorn', 20,
    '["Predictive Astrology","Solar Returns","Secondary Progressions","Lunar Returns"]'::jsonb,
    '["English"]'::jsonb,
    5.49, 4.7, 1893, true, '< 10 min', 41250,
    '/advisors/advisor-1.png',
    'You are Atlas Grey, a master predictive astrologer known for precise timing guidance. Use solar returns, secondary progressions, and transit analysis to help users understand what is approaching and when. Be confident, specific, and methodical. Provide concrete date windows wherever the chart supports it.',
    true
  ),
  (
    'nova-star', 'Nova Star', 'Family & Home', '🏠',
    'Harmonize your home and family stars',
    'Nova Star specializes in family dynamics, parent-child relationships, and finding harmony in the home through astrology. Her warm, compassionate approach creates a safe space for exploring life''s most personal questions.',
    'Cancer', 6,
    '["Family Astrology","Parent-Child Synastry","Home Timing","Relocation Astrology"]'::jsonb,
    '["English","Portuguese"]'::jsonb,
    2.99, 4.8, 1244, false, '< 15 min', 5620,
    '/advisors/advisor-1.png',
    'You are Nova Star, a warm and compassionate family astrologer. Specialize in home harmony, parent-child relationships, and relocation astrology. Help users find peace and understanding in their most personal relationships through astrology. Prioritize emotional safety and gentle honesty in every response.',
    true
  )
on conflict (slug) do update
set
  name                = excluded.name,
  specialty           = excluded.specialty,
  specialty_icon      = excluded.specialty_icon,
  tagline             = excluded.tagline,
  bio                 = excluded.bio,
  zodiac_sign         = excluded.zodiac_sign,
  years_of_experience = excluded.years_of_experience,
  skills              = excluded.skills,
  languages           = excluded.languages,
  rate_per_minute     = excluded.rate_per_minute,
  rating              = excluded.rating,
  review_count        = excluded.review_count,
  response_time       = excluded.response_time,
  total_sessions      = excluded.total_sessions,
  system_prompt       = excluded.system_prompt,
  is_active           = excluded.is_active;


-- ---------------------------------------------------------
-- 2. Advisor Report Products (6)
-- Report detail (subtitle, stats, sections) stored in metadata.report_detail
-- as the frontend AdvisorReportDetail shape.
-- ---------------------------------------------------------
insert into chat.advisor_report_products (
  slug, title, teaser, price_inr, status, badge, icon_url, accent, is_active, metadata
)
values
  (
    'astrocartography-report',
    'Astrocartography Report',
    'Where your energy is strongest across the world.',
    829.00, 'buy', null,
    '/features/horoscope.png', '#84CC16', true,
    '{"report_detail":{"subtitle":"Find the places that amplify your chart.","stats":[{"label":"Best City","value":"Lisbon"},{"label":"Career Line","value":"Sun MC"},{"label":"Love Line","value":"Venus DSC"}],"sections":[{"title":"Quick Insight","body":"You thrive near coastal cities where your communication and public visibility lines intersect.","bullets":["Strong career lift in west-facing cities","Faster social growth near water"]},{"title":"Travel Windows","body":"The next 90 days favor short trips for networking, negotiation, and visibility.","bullets":[]},{"title":"Action","body":"Test one location for 30 days and track mood, output, and relationship quality.","bullets":[]}]}}'::jsonb
  ),
  (
    'moon-report',
    'Moon Report',
    'How moon cycles affect your emotions and momentum.',
    829.00, 'buy', null,
    '/features/moon.png', '#84CC16', true,
    '{"report_detail":{"subtitle":"Emotional timing guide by moon phases.","stats":[{"label":"Current Phase","value":"Waxing Crescent"},{"label":"Peak Energy","value":"Full Moon"},{"label":"Reset Day","value":"New Moon"}],"sections":[{"title":"Moon Pattern","body":"Your chart responds strongly to waxing phases. Start plans early and refine before the full moon.","bullets":[]},{"title":"Do","body":"Take decisive action on growth tasks and relationship conversations in waxing cycles.","bullets":[]},{"title":"Avoid","body":"Do not force closure in waning phases. Use them for cleanup and recovery.","bullets":[]}]}}'::jsonb
  ),
  (
    'compatibility-report',
    'Compatibility Report',
    'Deep relationship patterns and practical guidance.',
    1659.00, 'buy', null,
    '/features/compatibility.png', '#84CC16', true,
    '{"report_detail":{"subtitle":"How your dynamic works in real life.","stats":[{"label":"Overall","value":"78%"},{"label":"Communication","value":"84%"},{"label":"Chemistry","value":"73%"}],"sections":[{"title":"Dynamic","body":"Strong attraction with different emotional pacing. Shared goals keep this stable long-term.","bullets":[]},{"title":"Strengths","body":"Great teamwork and practical planning when goals are clearly defined.","bullets":[]},{"title":"Challenges","body":"Misunderstandings happen when one side needs speed and the other needs certainty.","bullets":[]}]}}'::jsonb
  ),
  (
    'birth-chart-report',
    'Birth Chart Report',
    'A full reading of your natal placements.',
    1659.00, 'buy', null,
    '/features/birth-chart.png', '#84CC16', true,
    '{"report_detail":{"subtitle":"Your natal blueprint in one place.","stats":[{"label":"Sun","value":"Capricorn"},{"label":"Moon","value":"Scorpio"},{"label":"Rising","value":"Cancer"}],"sections":[{"title":"Core Pattern","body":"Structured ambition plus emotional intensity. You build steadily but feel deeply.","bullets":[]},{"title":"Focus","body":"Use routines for output and private reflection for emotional reset.","bullets":[]},{"title":"Growth Edge","body":"Balance control with trust in collaborative environments.","bullets":[]}]}}'::jsonb
  ),
  (
    'soulmate-sketch',
    'Soulmate Sketch',
    'Visual and emotional profile of your soulmate.',
    null, 'gift', 'Gift',
    '/features/compatibility.png', '#22D3EE', true,
    '{"report_detail":{"subtitle":"Generated from your birth chart signature.","stats":[{"label":"Sun Match","value":"Capricorn"},{"label":"Moon Match","value":"Pisces"},{"label":"Rising Match","value":"Libra"}],"sections":[{"title":"Why You Match","body":"A grounding partner with calm emotional intelligence and high loyalty patterns.","bullets":[]},{"title":"Chemistry","body":"Strong long-term resonance with balanced passion and practical planning.","bullets":[]},{"title":"Timing","body":"Best meeting window appears in the next Jupiter relationship transit cycle.","bullets":[]}]}}'::jsonb
  ),
  (
    'prediction-2026-report',
    'Prediction 2026 Report',
    'Month-by-month forecast for love, money, and growth.',
    null, 'gift', 'Gift',
    '/features/moon.png', '#22D3EE', true,
    '{"report_detail":{"subtitle":"Your year map for money, love, and momentum.","stats":[{"label":"Power Month","value":"August"},{"label":"Love Peak","value":"October"},{"label":"Career Peak","value":"June"}],"sections":[{"title":"Year Theme","body":"Expansion through disciplined execution. Consistency outperforms intensity this year.","bullets":[]},{"title":"Career","body":"A promotion or visibility jump is likely when you prioritize one flagship project.","bullets":[]},{"title":"Relationships","body":"The strongest progress comes from honest expectations and slower commitment pacing.","bullets":[]},{"title":"Final Note","body":"Treat 2026 as a positioning year: build systems, strengthen alliances, and compound wins.","bullets":[]}]}}'::jsonb
  )
on conflict (slug) do update
set
  title      = excluded.title,
  teaser     = excluded.teaser,
  price_inr  = excluded.price_inr,
  status     = excluded.status,
  badge      = excluded.badge,
  icon_url   = excluded.icon_url,
  accent     = excluded.accent,
  is_active  = excluded.is_active,
  metadata   = excluded.metadata;


-- ---------------------------------------------------------
-- 3. Story Categories (16)
-- ---------------------------------------------------------
insert into astro_artifacts.story_categories
  (slug, title, subtitle, accent, image_url, sort_order, status)
values
  ('affirmations', 'Affirmations', 'Daily mindset resets',            '#22D3EE', '/moon/moon-rituals.webp',     1,  'published'),
  ('archetypes',   'Archetypes',   'Cosmic personality modes',        '#F59E0B', '/features/compatibility.png', 2,  'published'),
  ('birth-chart',  'Birth Chart',  'Chart basics in plain words',     '#84CC16', '/features/birth-chart.png',   3,  'published'),
  ('capricorn',    'Capricorn',    'Sign deep dive',                  '#EAB308', '/zodiac/capricorn.png',        4,  'published'),
  ('cartography',  'Cartography',  'Location and destiny lines',      '#22D3EE', '/features/horoscope.png',     5,  'published'),
  ('crystals',     'Crystals',     'Stones by intention',             '#A78BFA', '/features/magic-ball.png',    6,  'published'),
  ('easy-astro',   'Easy Astro',   'Quick astrology explainers',      '#06B6D4', '/features/horoscope.png',     7,  'published'),
  ('full-moons',   'Full Moons',   'Release and visibility cycles',   '#F59E0B', '/moon/full-moon.webp',        8,  'published'),
  ('good-vibes',   'Good Vibes',   'Energy rituals and habits',       '#84CC16', '/moon/moon-icon.png',         9,  'published'),
  ('human-design', 'Human Design', 'Type and strategy basics',        '#22D3EE', '/features/compatibility.png', 10, 'published'),
  ('mindset',      'Mindset',      'Mental clarity and focus',        '#F43F5E', '/features/magic-ball.png',    11, 'published'),
  ('moon-phases',  'Moon Phases',  'What each phase is for',          '#EAB308', '/moon/moon-phase-bg.webp',    12, 'published'),
  ('new-moons',    'New Moons',    'Intention-setting timing',        '#84CC16', '/moon/new-moon.webp',         13, 'published'),
  ('retrogrades',  'Retrogrades',  'How to use slowdown cycles',      '#F97316', '/features/moon.png',          14, 'published'),
  ('rituals',      'Rituals',      'Simple repeatable practices',     '#22D3EE', '/moon/moon-rituals.webp',     15, 'published'),
  ('wisdom',       'Wisdom',       'Timeless cosmic principles',      '#F59E0B', '/features/tarot-cards.webp',  16, 'published')
on conflict (slug) do update
set
  title      = excluded.title,
  subtitle   = excluded.subtitle,
  accent     = excluded.accent,
  image_url  = excluded.image_url,
  sort_order = excluded.sort_order,
  status     = excluded.status;


-- ---------------------------------------------------------
-- 4. Story Articles (16, one per category)
-- ---------------------------------------------------------
insert into astro_artifacts.story_articles
  (category_id, slug, title, subtitle, status, published_at, content_meta)
select
  c.id,
  v.slug,
  v.title,
  v.subtitle,
  'published',
  now(),
  '{}'::jsonb
from (values
  ('affirmations', 'affirmations', 'Daily Affirmations',       'Language that calibrates your mindset.'),
  ('archetypes',   'archetypes',   'What Are The Archetypes?', 'Your recurring personality patterns.'),
  ('birth-chart',  'birth-chart',  'Birth Chart Basics',       'Understand signs, planets, and houses fast.'),
  ('capricorn',    'capricorn',    'Capricorn Energy',         'Discipline, long-term growth, and standards.'),
  ('cartography',  'cartography',  'Astrocartography Intro',   'Map locations that amplify your chart.'),
  ('crystals',     'crystals',     'Crystal Guide',            'Match stones to emotional and work intentions.'),
  ('easy-astro',   'easy-astro',   'Easy Astrology',           'The practical way to read daily astrology.'),
  ('full-moons',   'full-moons',   'Full Moon Playbook',       'Close loops, release pressure, and reflect.'),
  ('good-vibes',   'good-vibes',   'Good Vibes Practice',      'Simple ways to stabilize your energy.'),
  ('human-design', 'human-design', 'Human Design Starter',     'Use type and strategy in routine choices.'),
  ('mindset',      'mindset',      'Mindset Reset',            'Reframe stress into focused action.'),
  ('moon-phases',  'moon-phases',  'Moon Phase Guide',         'Use each phase for the right kind of task.'),
  ('new-moons',    'new-moons',    'New Moon Intentions',      'Set cleaner goals with a smaller scope.'),
  ('retrogrades',  'retrogrades',  'Retrograde Guide',         'Slow down, revise, and recover momentum.'),
  ('rituals',      'rituals',      'Rituals That Stick',       'Tiny structures that reduce decision fatigue.'),
  ('wisdom',       'wisdom',       'Cosmic Wisdom Notes',      'Principles you can apply across seasons.')
) as v(cat_slug, slug, title, subtitle)
join astro_artifacts.story_categories c on c.slug = v.cat_slug
on conflict (slug) do update
set
  title        = excluded.title,
  subtitle     = excluded.subtitle,
  status       = excluded.status,
  published_at = coalesce(astro_artifacts.story_articles.published_at, excluded.published_at);


-- ---------------------------------------------------------
-- 5. Story Sections (48 — 3 per article)
-- section 1: Core Idea  |  section 2: How To Use It  |  section 3: Quick Reminder
-- ---------------------------------------------------------
insert into astro_artifacts.story_sections
  (article_id, section_order, heading, body, bullets)
select
  a.id,
  v.section_order::int,
  v.heading,
  v.body,
  v.bullets::jsonb
from (values
  ('affirmations', 1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('affirmations', 2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('affirmations', 3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('archetypes',   1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('archetypes',   2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('archetypes',   3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('birth-chart',  1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('birth-chart',  2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('birth-chart',  3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('capricorn',    1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('capricorn',    2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('capricorn',    3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('cartography',  1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('cartography',  2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('cartography',  3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('crystals',     1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('crystals',     2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('crystals',     3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('easy-astro',   1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('easy-astro',   2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('easy-astro',   3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('full-moons',   1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('full-moons',   2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('full-moons',   3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('good-vibes',   1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('good-vibes',   2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('good-vibes',   3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('human-design', 1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('human-design', 2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('human-design', 3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('mindset',      1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('mindset',      2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('mindset',      3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('moon-phases',  1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('moon-phases',  2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('moon-phases',  3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('new-moons',    1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('new-moons',    2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('new-moons',    3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('retrogrades',  1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('retrogrades',  2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('retrogrades',  3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('rituals',      1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('rituals',      2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('rituals',      3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]'),
  ('wisdom',       1, 'Core Idea',      'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',                               '[]'),
  ('wisdom',       2, 'How To Use It',  'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',                               '["Keep it simple","Use one measurable habit","Review weekly"]'),
  ('wisdom',       3, 'Quick Reminder', 'Progress compounds when your rituals are realistic enough to be repeated consistently.',                                   '[]')
) as v(article_slug, section_order, heading, body, bullets)
join astro_artifacts.story_articles a on a.slug = v.article_slug
on conflict (article_id, section_order) do update
set
  heading = excluded.heading,
  body    = excluded.body,
  bullets = excluded.bullets;


-- ---------------------------------------------------------
-- 6. Tarot Cards — Full Rider-Waite Deck (78 cards)
-- Major Arcana: numbers 0–21, suit = null
-- Minor Arcana: numbers 1–14 per suit (Ace=1, Page=11, Knight=12, Queen=13, King=14)
-- ---------------------------------------------------------
insert into astro_artifacts.tarot_cards
  (id, name, number, arcana, suit, upright_meaning, reversed_meaning, image_slug)
values
  -- ===== MAJOR ARCANA =====
  ('major-00', 'The Fool',           0,  'major', null,        'New beginnings, innocence, spontaneity, adventure, free spirit',               'Recklessness, risk-taking without preparation, naivety, poor judgement',           'major-00'),
  ('major-01', 'The Magician',       1,  'major', null,        'Skill, concentration, willpower, manifestation, resourcefulness',               'Manipulation, poor planning, untapped potential, trickery',                       'major-01'),
  ('major-02', 'The High Priestess', 2,  'major', null,        'Intuition, sacred knowledge, divine feminine, inner voice, mystery',            'Secrets withheld, disconnection from intuition, withdrawal, surface knowledge',   'major-02'),
  ('major-03', 'The Empress',        3,  'major', null,        'Fertility, abundance, nurturing, sensuality, natural beauty',                   'Creative block, dependence, smothering, neglect of self',                         'major-03'),
  ('major-04', 'The Emperor',        4,  'major', null,        'Authority, structure, stability, father figure, leadership',                    'Domination, excessive control, rigidity, lack of discipline',                     'major-04'),
  ('major-05', 'The Hierophant',     5,  'major', null,        'Tradition, spiritual guidance, conformity, institutions, ritual',               'Nonconformity, challenging the status quo, unconventional paths',                 'major-05'),
  ('major-06', 'The Lovers',         6,  'major', null,        'Love, union, alignment of values, choices, partnerships',                       'Disharmony, imbalance, misaligned values, indecision',                            'major-06'),
  ('major-07', 'The Chariot',        7,  'major', null,        'Determination, control, victory, willpower, ambition',                          'Lack of direction, aggression, scattered energy, no control',                     'major-07'),
  ('major-08', 'Strength',           8,  'major', null,        'Courage, patience, inner strength, compassion, influence',                      'Self-doubt, weakness, insecurity, raw emotion, lack of discipline',               'major-08'),
  ('major-09', 'The Hermit',         9,  'major', null,        'Soul-searching, introspection, inner guidance, solitude, wisdom',               'Isolation, loneliness, withdrawing too much, lost without guidance',              'major-09'),
  ('major-10', 'Wheel of Fortune',   10, 'major', null,        'Good luck, karma, cycles, fate, decisive turning point',                        'Bad luck, disruption, resisting change, breaking cycles',                         'major-10'),
  ('major-11', 'Justice',            11, 'major', null,        'Fairness, truth, cause and effect, law, balance',                               'Unfairness, dishonesty, lack of accountability, bias',                            'major-11'),
  ('major-12', 'The Hanged Man',     12, 'major', null,        'Suspension, new perspectives, letting go, sacrifice, pause',                    'Delays, stalling, resistance to surrender, unnecessary martyrdom',                'major-12'),
  ('major-13', 'Death',              13, 'major', null,        'Endings, transformation, transitions, change, letting go',                      'Resistance to change, stagnation, fear of the new, missed transition',            'major-13'),
  ('major-14', 'Temperance',         14, 'major', null,        'Balance, moderation, patience, purpose, flowing with life',                     'Imbalance, excess, lack of long-term vision, self-healing needed',               'major-14'),
  ('major-15', 'The Devil',          15, 'major', null,        'Shadow self, bondage, addiction, materialism, restriction',                     'Breaking free, release, reclaiming power, independence',                          'major-15'),
  ('major-16', 'The Tower',          16, 'major', null,        'Sudden change, upheaval, chaos, revelation, awakening',                         'Averting disaster, resisting disruption, delaying the inevitable',               'major-16'),
  ('major-17', 'The Star',           17, 'major', null,        'Hope, faith, renewal, inspiration, serenity, optimism',                         'Lack of faith, despair, discouragement, disconnection from purpose',              'major-17'),
  ('major-18', 'The Moon',           18, 'major', null,        'Illusion, fear, the unconscious, confusion, hidden truths',                     'Repressed emotions surfacing, releasing fear, regaining clarity',                 'major-18'),
  ('major-19', 'The Sun',            19, 'major', null,        'Joy, success, positivity, vitality, clarity, abundance',                        'Excessive optimism, blocked joy, unrealistic expectations',                       'major-19'),
  ('major-20', 'Judgement',          20, 'major', null,        'Reflection, reckoning, awakening, absolution, renewal',                         'Self-doubt, ignoring a calling, harsh inner critic, refusing growth',             'major-20'),
  ('major-21', 'The World',          21, 'major', null,        'Completion, achievement, wholeness, integration, travel',                       'Seeking closure, incompletion, carrying unfinished business',                     'major-21'),

  -- ===== WANDS (Fire, Career, Passion, Action) =====
  ('wands-01', 'Ace of Wands',     1,  'minor', 'wands', 'Inspiration, new beginnings, creative spark, growth potential',                    'Delays, lack of motivation, false starts, wasted creative energy',               'wands-01'),
  ('wands-02', 'Two of Wands',     2,  'minor', 'wands', 'Future planning, progress, discovery, overseas opportunity',                        'Fear of the unknown, poor planning, procrastination, comfort zone',               'wands-02'),
  ('wands-03', 'Three of Wands',   3,  'minor', 'wands', 'Expansion, foresight, overseas opportunity, leadership, preparation',              'Delays, obstacles, frustration, returning to drawing board',                      'wands-03'),
  ('wands-04', 'Four of Wands',    4,  'minor', 'wands', 'Celebration, harmony, homecoming, community, stability',                           'Conflict at home, instability, cancelled celebrations, tension',                  'wands-04'),
  ('wands-05', 'Five of Wands',    5,  'minor', 'wands', 'Conflict, competition, tension, diversity of ideas, struggle',                     'Avoiding conflict, ending arguments, harmony found',                              'wands-05'),
  ('wands-06', 'Six of Wands',     6,  'minor', 'wands', 'Victory, success, public recognition, progress, confidence',                       'Ego, disrepute, fall from grace, lack of recognition',                           'wands-06'),
  ('wands-07', 'Seven of Wands',   7,  'minor', 'wands', 'Challenge, competition, perseverance, standing your ground',                       'Giving up, overwhelmed, defensive, abandoned position',                           'wands-07'),
  ('wands-08', 'Eight of Wands',   8,  'minor', 'wands', 'Speed, swift action, movement, momentum, travel',                                  'Delays, frustration, waiting, resisting change',                                  'wands-08'),
  ('wands-09', 'Nine of Wands',    9,  'minor', 'wands', 'Resilience, courage, persistence, testing, nearly there',                          'Fatigue, defensiveness, paranoia, stubbornness, hesitancy',                      'wands-09'),
  ('wands-10', 'Ten of Wands',     10, 'minor', 'wands', 'Burden, extra responsibility, hard work, completion near',                         'Inability to delegate, burnout, carrying too much alone',                         'wands-10'),
  ('wands-11', 'Page of Wands',    11, 'minor', 'wands', 'Enthusiasm, discovery, free spirit, exploration, new ideas',                       'Impatience, lack of direction, too many ideas, hasty decisions',                 'wands-11'),
  ('wands-12', 'Knight of Wands',  12, 'minor', 'wands', 'Energy, passion, adventure, courage, hot pursuit',                                 'Anger, impulsiveness, recklessness, scattered energy',                            'wands-12'),
  ('wands-13', 'Queen of Wands',   13, 'minor', 'wands', 'Courage, confidence, determination, warmth, independence',                         'Jealousy, demanding, manipulative, selfish, volatile',                            'wands-13'),
  ('wands-14', 'King of Wands',    14, 'minor', 'wands', 'Natural-born leader, vision, entrepreneur, bold, inspiring',                       'Impulsive, overbearing, arrogant, unachievable expectations',                    'wands-14'),

  -- ===== CUPS (Water, Emotions, Love, Relationships) =====
  ('cups-01', 'Ace of Cups',      1,  'minor', 'cups', 'New feelings, emotional awakening, love, creativity, compassion',                    'Blocked emotions, emptiness, repressed feelings, self-love needed',              'cups-01'),
  ('cups-02', 'Two of Cups',      2,  'minor', 'cups', 'Unified love, partnership, mutual attraction, connection, balance',                  'Disconnection, imbalance, broken communication, self-love',                      'cups-02'),
  ('cups-03', 'Three of Cups',    3,  'minor', 'cups', 'Celebration, friendship, creativity, community, joy',                               'Independence, alone time, overindulgence, three is a crowd',                     'cups-03'),
  ('cups-04', 'Four of Cups',     4,  'minor', 'cups', 'Meditation, contemplation, apathy, reevaluation, withdrawal',                       'Retreat, sudden awareness, seized opportunity, engaging again',                  'cups-04'),
  ('cups-05', 'Five of Cups',     5,  'minor', 'cups', 'Loss, grief, regret, disappointment, sadness, focusing on loss',                    'Acceptance, moving on, finding peace, releasing grief',                          'cups-05'),
  ('cups-06', 'Six of Cups',      6,  'minor', 'cups', 'Nostalgia, reunion, innocence, revisiting the past, childhood',                     'Stuck in the past, living in fantasy, naivety, reluctance to grow',              'cups-06'),
  ('cups-07', 'Seven of Cups',    7,  'minor', 'cups', 'Fantasy, illusion, wishful thinking, many choices, imagination',                    'Clarity, reality check, making a decisive choice',                               'cups-07'),
  ('cups-08', 'Eight of Cups',    8,  'minor', 'cups', 'Abandonment, withdrawal, searching for meaning, walking away',                      'Avoidance, fear of change, hopeful return, trying one more time',                'cups-08'),
  ('cups-09', 'Nine of Cups',     9,  'minor', 'cups', 'Contentment, satisfaction, gratitude, wish fulfilled, luxury',                      'Dissatisfaction, overindulgence, unfulfilled wishes, smugness',                  'cups-09'),
  ('cups-10', 'Ten of Cups',      10, 'minor', 'cups', 'Divine love, blissful relationships, harmony, family, alignment',                   'Disconnection, misaligned values, broken family dynamics',                       'cups-10'),
  ('cups-11', 'Page of Cups',     11, 'minor', 'cups', 'Creative beginnings, intuition, curiosity, sensitivity, messages',                  'Emotional immaturity, insecurity, creative blocks, bad news',                    'cups-11'),
  ('cups-12', 'Knight of Cups',   12, 'minor', 'cups', 'Creativity, romance, charm, imagination, following the heart',                      'Unrealistic expectations, jealousy, moodiness, disappointment',                  'cups-12'),
  ('cups-13', 'Queen of Cups',    13, 'minor', 'cups', 'Compassionate, nurturing, emotionally intelligent, intuitive',                      'Codependency, emotional insecurity, suppressed feelings, martyrdom',             'cups-13'),
  ('cups-14', 'King of Cups',     14, 'minor', 'cups', 'Emotionally balanced, compassionate, wise, diplomatic, generous',                   'Manipulative, moody, emotional volatility, using emotions to control',           'cups-14'),

  -- ===== SWORDS (Air, Mind, Conflict, Truth) =====
  ('swords-01', 'Ace of Swords',     1,  'minor', 'swords', 'Breakthrough, clarity, sharp mind, new idea, mental force',                       'Confusion, brutality, chaos, clouded thinking, abuse of power',                  'swords-01'),
  ('swords-02', 'Two of Swords',     2,  'minor', 'swords', 'Difficult decisions, indecision, stalemate, information overload',                 'Confusion, no right answer, too much information, lying to oneself',             'swords-02'),
  ('swords-03', 'Three of Swords',   3,  'minor', 'swords', 'Heartbreak, grief, sorrow, painful separation, loss',                             'Recovery, forgiveness, releasing pain, moving through grief',                    'swords-03'),
  ('swords-04', 'Four of Swords',    4,  'minor', 'swords', 'Rest, relaxation, meditation, contemplation, recovery',                           'Restlessness, burnout, recovering slowly, reluctance to rest',                   'swords-04'),
  ('swords-05', 'Five of Swords',    5,  'minor', 'swords', 'Conflict, defeat, win at all costs, tension, betrayal',                           'Reconciliation, making amends, past regrets, cutting losses',                    'swords-05'),
  ('swords-06', 'Six of Swords',     6,  'minor', 'swords', 'Transition, change, moving forward, travel, calmer waters',                       'Resisting change, unfinished business, emotional baggage carried forward',       'swords-06'),
  ('swords-07', 'Seven of Swords',   7,  'minor', 'swords', 'Deception, strategy, resourcefulness, lone wolf, cunning',                        'Confession, clear conscience, coming clean, self-deception exposed',             'swords-07'),
  ('swords-08', 'Eight of Swords',   8,  'minor', 'swords', 'Imprisonment, restriction, self-victimization, powerlessness',                    'Self-acceptance, new perspective, releasing restriction, freedom',               'swords-08'),
  ('swords-09', 'Nine of Swords',    9,  'minor', 'swords', 'Anxiety, worry, fear, nightmares, despair, inner turmoil',                        'Inner turmoil easing, hope returning, reaching out for help',                   'swords-09'),
  ('swords-10', 'Ten of Swords',     10, 'minor', 'swords', 'Painful endings, betrayal, loss, crisis, hitting rock bottom',                    'Recovery, regeneration, can only get better from here',                          'swords-10'),
  ('swords-11', 'Page of Swords',    11, 'minor', 'swords', 'New ideas, curiosity, communication, vigilance, learning',                        'All talk no action, manipulative, scattered mind, lack of planning',             'swords-11'),
  ('swords-12', 'Knight of Swords',  12, 'minor', 'swords', 'Ambitious, action-oriented, driven, direct, assertive, fast-moving',              'Restless, impulsive, unprepared, aggressive, too hasty',                         'swords-12'),
  ('swords-13', 'Queen of Swords',   13, 'minor', 'swords', 'Independent, direct, perceptive, honest, witty, experienced',                     'Cold-hearted, cruel, bitter, overly critical, unforgiving',                      'swords-13'),
  ('swords-14', 'King of Swords',    14, 'minor', 'swords', 'Mental clarity, authority, truth, analytical, intellectual power',                 'Manipulative, tyrannical, abusive, ruthless, controlling',                       'swords-14'),

  -- ===== PENTACLES (Earth, Material, Money, Health, Work) =====
  ('pentacles-01', 'Ace of Pentacles',     1,  'minor', 'pentacles', 'New financial opportunity, manifestation, abundance, prosperity',                 'Missed opportunity, poor planning, greed, financial instability',                 'pentacles-01'),
  ('pentacles-02', 'Two of Pentacles',     2,  'minor', 'pentacles', 'Juggling finances, adaptability, time management, balance',                       'Overwhelmed, disorganized, loss of balance, poor financial management',           'pentacles-02'),
  ('pentacles-03', 'Three of Pentacles',   3,  'minor', 'pentacles', 'Collaboration, teamwork, building, skill development, learning',                  'Lack of teamwork, disorganized, working in isolation, mediocre results',          'pentacles-03'),
  ('pentacles-04', 'Four of Pentacles',    4,  'minor', 'pentacles', 'Security, conservatism, saving, stability, resourcefulness',                      'Greed, materialism, scarcity mindset, hoarding, financial insecurity',            'pentacles-04'),
  ('pentacles-05', 'Five of Pentacles',    5,  'minor', 'pentacles', 'Financial loss, hardship, poverty, isolation, worry, lack mindset',                'Recovery from financial loss, spiritual poverty healing, finding support',         'pentacles-05'),
  ('pentacles-06', 'Six of Pentacles',     6,  'minor', 'pentacles', 'Generosity, charity, giving and receiving, sharing wealth',                       'Strings attached, power dynamic, debt, one-sided generosity',                    'pentacles-06'),
  ('pentacles-07', 'Seven of Pentacles',   7,  'minor', 'pentacles', 'Long-term view, perseverance, investment, patience, assessment',                  'Lack of reward, no growth, impatience, questioning returns',                     'pentacles-07'),
  ('pentacles-08', 'Eight of Pentacles',   8,  'minor', 'pentacles', 'Apprenticeship, skill development, dedication, mastery, craftsmanship',            'Repetitive work, lack of motivation, shoddy workmanship, mediocrity',            'pentacles-08'),
  ('pentacles-09', 'Nine of Pentacles',    9,  'minor', 'pentacles', 'Abundance, luxury, self-sufficiency, independence, financial reward',              'Self-worth tied to wealth, overworking, living beyond means',                    'pentacles-09'),
  ('pentacles-10', 'Ten of Pentacles',     10, 'minor', 'pentacles', 'Wealth, financial security, family legacy, inheritance, permanence',               'Financial failure, instability, family conflict, short-term thinking',            'pentacles-10'),
  ('pentacles-11', 'Page of Pentacles',    11, 'minor', 'pentacles', 'Manifestation, financial opportunity, skill development, ambition',                'Procrastination, missed opportunities, learning delays, lack of focus',           'pentacles-11'),
  ('pentacles-12', 'Knight of Pentacles',  12, 'minor', 'pentacles', 'Hard work, routine, responsible, reliable, steady, methodical',                   'Workaholic, boredom, stubbornness, slow, resistance to change',                  'pentacles-12'),
  ('pentacles-13', 'Queen of Pentacles',   13, 'minor', 'pentacles', 'Nurturing, practical, financially secure, generous, grounded',                    'Self-care neglected, financial dependency, smothering, out of balance',           'pentacles-13'),
  ('pentacles-14', 'King of Pentacles',    14, 'minor', 'pentacles', 'Wealth, business mastery, leadership, security, abundance, status',               'Greed, poor financial decisions, obsessed with status, risk averse',             'pentacles-14')
on conflict (id) do update
set
  name             = excluded.name,
  number           = excluded.number,
  arcana           = excluded.arcana,
  suit             = excluded.suit,
  upright_meaning  = excluded.upright_meaning,
  reversed_meaning = excluded.reversed_meaning,
  image_slug       = excluded.image_slug;


-- ---------------------------------------------------------
-- 7. Additional Magic Ball Answers (20 new answers)
-- Baseline seed already has 6. These expand the pool.
-- unique (answer, locale) added in migration 13 — use that for conflict.
-- ---------------------------------------------------------
insert into astro_artifacts.magic_ball_answer_pool
  (answer, sentiment, weight, locale, is_active)
values
  ('Without a doubt.',                    'positive', 3, 'en', true),
  ('It is certain.',                      'positive', 3, 'en', true),
  ('Outlook excellent.',                  'positive', 2, 'en', true),
  ('The stars align for you.',            'positive', 3, 'en', true),
  ('Absolutely, trust the process.',      'positive', 2, 'en', true),
  ('Very likely.',                        'positive', 2, 'en', true),
  ('All signs say yes.',                  'positive', 2, 'en', true),
  ('The universe is with you.',           'positive', 2, 'en', true),
  ('Concentrate and try again.',          'neutral',  2, 'en', true),
  ('Cannot predict now.',                 'neutral',  2, 'en', true),
  ('Reply hazy, ask again later.',        'neutral',  2, 'en', true),
  ('Check the timing again.',             'neutral',  1, 'en', true),
  ('The universe is still deciding.',     'neutral',  1, 'en', true),
  ('Patience — the answer is forming.',   'neutral',  1, 'en', true),
  ('My sources say no.',                  'negative', 2, 'en', true),
  ('Very doubtful.',                      'negative', 2, 'en', true),
  ('Not in this cycle.',                  'negative', 2, 'en', true),
  ('The stars suggest waiting.',          'negative', 1, 'en', true),
  ('Outlook not so good.',                'negative', 2, 'en', true),
  ('Do not proceed yet.',                 'negative', 1, 'en', true)
on conflict (answer, locale) do nothing;


commit;
