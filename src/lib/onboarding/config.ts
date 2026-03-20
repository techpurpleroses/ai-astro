import { BRAND_NAME } from "@/lib/brand";

export const ONBOARDING_CATEGORIES = [
  "moon",
  "compatibility",
  "numerology",
  "palm-reading",
  "past-lives",
  "astrocartography",
  "sketch",
] as const;

export type OnboardingCategorySlug = (typeof ONBOARDING_CATEGORIES)[number];

export type OnboardingStepKind =
  | "intro"          // welcome landing page with gender cards (step 1)
  | "single-choice"  // full-width buttons with emoji/color dot
  | "multi-choice"   // chip-grid multi-select
  | "scroll-date"    // iOS drum date picker (Month / Day / Year)
  | "scroll-time"    // iOS drum time picker (HH / MM / AM-PM)
  | "text"           // text input (birth-place with autocomplete)
  | "upload-photo"   // photo upload (general)
  | "palm-photo"     // palm illustration + camera/upload
  | "loading"        // auto-advance spinner
  | "birth-chart"    // animated chart wheel → result reveal with advisor bubble
  | "forecast"       // sphere fill animation + advisor bubble
  | "social-proof"   // testimonial cards (sketch only)
  | "advisor-intro"  // expert intro card (astrocartography)
  | "video-story"    // video/image bg + text overlay (astrocartography)
  | "plan-ready"     // "Your personal plan is ready!" animation (after palm scan)
  | "final";         // email sign-up (last step)

export interface OnboardingStepOption {
  value: string;
  label: string;
  description?: string;
  emoji?: string;   // shown as left icon on choice buttons
  color?: string;   // hex, shown as colored dot (color-pref step)
}

export interface OnboardingStep {
  id: string;
  kind: OnboardingStepKind;
  title: string;
  subtitle?: string;
  placeholder?: string;
  ctaLabel?: string;
  required?: boolean;
  options?: OnboardingStepOption[];
  autoAdvanceMs?: number;   // loading / birth-chart mapping phase duration
  maxSelect?: number;       // multi-choice cap
  forecastPercent?: number; // 34 | 67 | 100
  advisorMessage?: string;  // speech-bubble text on birth-chart / forecast
  advisorHighlight?: string;// word to highlight teal in advisorMessage
  videoStoryLines?: string[]; // lines of text for video-story overlay
  chartVariant?: "astrology" | "bodygraph" | "centers"; // birth-chart visual
}

export interface OnboardingCategoryConfig {
  slug: OnboardingCategorySlug;
  name: string;
  shortName: string;
  accent: string;
  description: string;
  steps: OnboardingStep[];
}

// ─── shared helpers ────────────────────────────────────────────────────────────

function cloneSteps(steps: OnboardingStep[]): OnboardingStep[] {
  return steps.map((s) => ({ ...s, options: s.options ? [...s.options] : undefined }));
}

// ─── shared question blocks ────────────────────────────────────────────────────

const BIRTH_DATE_STEP: OnboardingStep = {
  id: "birth-date",
  kind: "scroll-date",
  title: "When's your birthday?",
  subtitle:
    "It's also important to know your date of birth for making complete and accurate predictions",
  required: true,
  ctaLabel: "Continue",
};

const BIRTH_TIME_STEP: OnboardingStep = {
  id: "birth-time",
  kind: "scroll-time",
  title: "Do you know your birth time?",
  subtitle:
    "This helps us find out where planets were placed in the sky at the moment of your birth",
  required: false,
  ctaLabel: "Continue",
};

const BIRTH_PLACE_STEP: OnboardingStep = {
  id: "birth-place",
  kind: "text",
  title: "Where were you born?",
  subtitle: "The place is important to explore your core personality traits, needs, and desires",
  placeholder: "e.g. Mumbai, Maharashtra, India",
  required: true,
  ctaLabel: "Continue",
};

const RELATIONSHIP_STATUS_STEP: OnboardingStep = {
  id: "relationship-status",
  kind: "single-choice",
  title: "To get started, tell us about your current relationship status",
  required: true,
  options: [
    { value: "in-relationship", label: "In a relationship", emoji: "❤️" },
    { value: "just-broke-up",   label: "Just broke up",       emoji: "💔" },
    { value: "engaged",         label: "Engaged",              emoji: "🤩" },
    { value: "married",         label: "Married",              emoji: "💍" },
    { value: "looking",         label: "Looking for a soulmate", emoji: "⚡" },
    { value: "single",          label: "Single",               emoji: "😊" },
    { value: "complicated",     label: "It's complicated",     emoji: "🤔" },
  ],
};

const GOALS_STEP: OnboardingStep = {
  id: "goals",
  kind: "multi-choice",
  title: "What are your goals for the future?",
  maxSelect: 3,
  required: true,
  options: [
    { value: "family",    label: "Family harmony",    emoji: "🖤" },
    { value: "career",    label: "Career",             emoji: "💼" },
    { value: "health",    label: "Health",             emoji: "🏃" },
    { value: "marriage",  label: "Getting married",    emoji: "💫" },
    { value: "travel",    label: "Traveling the world", emoji: "🌍" },
    { value: "education", label: "Education",           emoji: "🎓" },
    { value: "friends",   label: "Friends",             emoji: "👥" },
    { value: "children",  label: "Children",            emoji: "🧒" },
  ],
};

const COLOR_PREF_STEP: OnboardingStep = {
  id: "color-pref",
  kind: "single-choice",
  title: "Which of the following colors do you prefer?",
  subtitle: "The color is important for better personalization",
  required: true,
  options: [
    { value: "red",    label: "Red",    color: "#ef4444" },
    { value: "yellow", label: "Yellow", color: "#eab308" },
    { value: "blue",   label: "Blue",   color: "#3b82f6" },
    { value: "orange", label: "Orange", color: "#f97316" },
    { value: "green",  label: "Green",  color: "#22c55e" },
    { value: "violet", label: "Violet", color: "#a855f7" },
  ],
};

const ELEMENT_STEP: OnboardingStep = {
  id: "element",
  kind: "single-choice",
  title: "Which element of nature do you like the best?",
  subtitle: "The element of nature is important for better personalization",
  required: true,
  options: [
    { value: "earth", label: "Earth", emoji: "🌿" },
    { value: "water", label: "Water", emoji: "🌊" },
    { value: "fire",  label: "Fire",  emoji: "🔥" },
    { value: "air",   label: "Air",   emoji: "💨" },
  ],
};

const LIFE_CHALLENGES_STEP: OnboardingStep = {
  id: "life-challenges",
  kind: "single-choice",
  title: "What challenges are you facing in your current period of life?",
  required: true,
  options: [
    { value: "loneliness",      label: "Feeling of loneliness",      emoji: "💔" },
    { value: "dissatisfaction", label: "Feeling of dissatisfaction",  emoji: "😔" },
    { value: "opportunities",   label: "Lack of opportunities",       emoji: "📭" },
    { value: "stress",          label: "Stress and anxiety",          emoji: "😨" },
    { value: "none",            label: "None of these",               emoji: "🧘" },
  ],
};

const PLAN_READY_STEP: OnboardingStep = {
  id: "plan-ready",
  kind: "plan-ready",
  title: "Your personal plan is ready!",
  autoAdvanceMs: 2500,
};

const PALM_PHOTO_STEP: OnboardingStep = {
  id: "palm-photo",
  kind: "palm-photo",
  title: "Take a photo of your left palm",
  subtitle: "Privacy is a priority for us. We only process non-identifiable data to ensure anonymity",
  ctaLabel: "Take a photo",
};

const FORECAST_34: OnboardingStep = {
  id: "forecast-1",
  kind: "forecast",
  title: "Forecast accuracy",
  forecastPercent: 34,
  advisorMessage:
    "The cosmic energy is building up! Share a bit more to reveal what's driving you",
  ctaLabel: "Continue",
};

const FORECAST_67: OnboardingStep = {
  id: "forecast-2",
  kind: "forecast",
  title: "Forecast accuracy",
  forecastPercent: 67,
  advisorMessage:
    "You're close to a big reveal! Confirm one last thing — and see your full story",
  ctaLabel: "Continue",
};

const FORECAST_100: OnboardingStep = {
  id: "forecast-3",
  kind: "forecast",
  title: "Forecast accuracy",
  forecastPercent: 100,
  advisorMessage: "Maximum accuracy reached! Let's reveal your powerful prediction!",
  ctaLabel: "Get the Results!",
};

const FINAL_STEP: OnboardingStep = {
  id: "complete",
  kind: "final",
  title: `Sign up to understand yourself better with ${BRAND_NAME}`,
  subtitle:
    "Your personal data is safe with us. We'll use your email for updates, receipts, and subscription details.",
  ctaLabel: "Continue",
};

// ─── Moon / Compatibility / Numerology (14 steps) ─────────────────────────────

const BASE_14_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    kind: "intro",
    title: "Personalized astrology report with powerful predictions",
    subtitle: "Complete a 1-minute quiz to get a personalized prediction.",
    options: [
      { value: "female",     label: "Female",     emoji: "♀" },
      { value: "male",       label: "Male",       emoji: "♂" },
      { value: "non-binary", label: "Non-binary", emoji: "⊕" },
    ],
  },
  BIRTH_DATE_STEP,
  BIRTH_TIME_STEP,
  BIRTH_PLACE_STEP,
  {
    id: "chart-mapping",
    kind: "birth-chart",
    title: "Mapping your birth chart...",
    chartVariant: "astrology",
    autoAdvanceMs: 2400,
    advisorMessage: "Your chart shows a rare spark — let's discover your best match",
    advisorHighlight: "rare spark",
    ctaLabel: "Continue",
  },
  FORECAST_34,
  RELATIONSHIP_STATUS_STEP,
  GOALS_STEP,
  COLOR_PREF_STEP,
  ELEMENT_STEP,
  {
    id: "advisor-result",
    kind: "birth-chart",
    title: "Your cosmic profile",
    chartVariant: "astrology",
    autoAdvanceMs: 1600,
    advisorMessage:
      "Your chart shows a rare spark — let's uncover how you can use this power!",
    advisorHighlight: "rare spark",
    ctaLabel: "Continue",
  },
  FORECAST_67,
  PALM_PHOTO_STEP,
  PLAN_READY_STEP,
  FINAL_STEP,
];

// ─── Palm Reading (14 steps — same base, different welcome title) ──────────────

const PALM_READING_STEPS: OnboardingStep[] = [
  {
    ...BASE_14_STEPS[0],
    title: "Unlock destiny with planets and palm reading",
    subtitle:
      "Complete a 1-minute quiz to get a personalized prediction. The result is not guaranteed and may vary from case to case",
  },
  ...cloneSteps(BASE_14_STEPS.slice(1)),
];

// ─── Past Lives (17 steps) ────────────────────────────────────────────────────

const PAST_LIVES_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    kind: "intro",
    title: "Personalized astrology report with powerful predictions",
    subtitle: "Complete a 1-minute quiz to get a personalized prediction.",
    options: [
      { value: "female",     label: "Female",     emoji: "♀" },
      { value: "male",       label: "Male",       emoji: "♂" },
      { value: "non-binary", label: "Non-binary", emoji: "⊕" },
    ],
  },
  BIRTH_DATE_STEP,
  BIRTH_TIME_STEP,
  BIRTH_PLACE_STEP,
  {
    id: "bodygraph-mapping",
    kind: "birth-chart",
    title: "Calculating your bodygraph...",
    chartVariant: "bodygraph",
    autoAdvanceMs: 2400,
    advisorMessage:
      "Your strongest center reveals your core energy pattern — let's take a closer look at yours",
    advisorHighlight: "core energy pattern",
    ctaLabel: "Continue",
  },
  {
    id: "energy-flow",
    kind: "single-choice",
    title: "How does your energy flow?",
    subtitle: "It helps to personalize your human design insights",
    required: true,
    options: [
      { value: "active",  label: "Stays active all day",        emoji: "🔋" },
      { value: "waves",   label: "Comes and goes in waves",     emoji: "🌊" },
      { value: "depends", label: "Depends on who's around",     emoji: "👥" },
      { value: "grows",   label: "Grows when I enjoy what I do", emoji: "🏆" },
    ],
  },
  {
    id: "group-behavior",
    kind: "single-choice",
    title: "How do you act in a group?",
    subtitle: "It helps to deepen your human design experience",
    required: true,
    options: [
      { value: "lead",    label: "Lead the way",              emoji: "🚀" },
      { value: "adapt",   label: "Adapt to the group's rhythm", emoji: "🌈" },
      { value: "bring",   label: "Bring people together",      emoji: "🤝" },
      { value: "observe", label: "Step back and observe",      emoji: "🧘" },
    ],
  },
  {
    id: "manifestor-result",
    kind: "birth-chart",
    title: "Your human design type",
    chartVariant: "bodygraph",
    autoAdvanceMs: 1600,
    advisorMessage:
      "Your human design shows Manifestor energy — let's see how to use it best",
    advisorHighlight: "Manifestor energy",
    ctaLabel: "Continue",
  },
  FORECAST_34,
  GOALS_STEP,
  RELATIONSHIP_STATUS_STEP,
  LIFE_CHALLENGES_STEP,
  {
    id: "centers-result",
    kind: "birth-chart",
    title: "Your key energy centers",
    chartVariant: "centers",
    autoAdvanceMs: 1600,
    advisorMessage:
      "Once your report is ready, focus on these centers — they align most with your goals",
    advisorHighlight: "centers",
    ctaLabel: "Continue",
  },
  FORECAST_67,
  PALM_PHOTO_STEP,
  PLAN_READY_STEP,
  FORECAST_100,
  FINAL_STEP,
];

// ─── Sketch (21 steps) ────────────────────────────────────────────────────────

const SKETCH_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    kind: "intro",
    title: "Discover Your Soulmate in a Sketch",
    subtitle:
      "Complete a 1-minute quiz to get a personalized prediction. The result is not guaranteed and may vary from case to case",
    options: [
      { value: "female",     label: "Female",     emoji: "♀" },
      { value: "male",       label: "Male",       emoji: "♂" },
      { value: "non-binary", label: "Non-binary", emoji: "⊕" },
    ],
  },
  BIRTH_DATE_STEP,
  BIRTH_TIME_STEP,
  BIRTH_PLACE_STEP,
  {
    id: "social-proof",
    kind: "social-proof",
    title: `250k+ people found love with ${BRAND_NAME}`,
    ctaLabel: "Continue",
  },
  RELATIONSHIP_STATUS_STEP,
  {
    id: "attracted-to",
    kind: "single-choice",
    title: "Who are you attracted to?",
    required: true,
    options: [
      { value: "male",   label: "Male",   emoji: "👦" },
      { value: "female", label: "Female", emoji: "👧" },
    ],
  },
  {
    id: "age-group",
    kind: "single-choice",
    title: "Which age group is your perfect match?",
    required: true,
    options: [
      { value: "20-25", label: "20–25" },
      { value: "25-30", label: "25–30" },
      { value: "30-35", label: "30–35" },
      { value: "35-40", label: "35–40" },
      { value: "40-45", label: "40–45" },
      { value: "45-50", label: "45–50" },
      { value: "50+",   label: "50+" },
    ],
  },
  {
    id: "appearance",
    kind: "single-choice",
    title: "What appearance are you imagining?",
    required: true,
    options: [
      { value: "white",    label: "Caucasian / White",      emoji: "🧑🏼" },
      { value: "hispanic", label: "Hispanic / Latino",      emoji: "🧑🏽" },
      { value: "black",    label: "African / African-American", emoji: "🧑🏿" },
      { value: "asian",    label: "Asian",                  emoji: "🧑🏻" },
      { value: "any",      label: "Any",                    emoji: "🌟" },
    ],
  },
  { ...FORECAST_34, id: "forecast-1" },
  {
    id: "biggest-struggle",
    kind: "single-choice",
    title: "What's your biggest struggle in life?",
    required: true,
    options: [
      { value: "trust",        label: "Learning to trust",          emoji: "🤝" },
      { value: "partner",      label: "Seeking a good partner",     emoji: "💞" },
      { value: "passion",      label: "Rekindling the passion",     emoji: "🔥" },
      { value: "needs",        label: "Understanding personal needs", emoji: "💡" },
      { value: "past",         label: "Breaking free from past",    emoji: "⛓" },
      { value: "uncertainty",  label: "Fear of uncertainty",        emoji: "🌊" },
      { value: "other",        label: "Other",                      emoji: "🔄" },
    ],
  },
  {
    id: "connection-type",
    kind: "single-choice",
    title: "What kind of connection are you looking for?",
    required: true,
    options: [
      { value: "partnership", label: "Partnership",    emoji: "🤝" },
      { value: "friendship",  label: "Friendship",     emoji: "💛" },
      { value: "adventure",   label: "Adventure",      emoji: "🌍" },
      { value: "depth",       label: "Emotional Depth", emoji: "💔" },
      { value: "growth",      label: "Mutual Growth",  emoji: "🌱" },
    ],
  },
  {
    id: "energy-type",
    kind: "single-choice",
    title: "Are you more drawn to similar or opposite energy?",
    required: true,
    options: [
      { value: "similar",  label: "Similar energy",   emoji: "✨" },
      { value: "opposite", label: "Opposite energy",  emoji: "💥" },
    ],
  },
  {
    id: "love-signal",
    kind: "single-choice",
    title: "What love signal means the most to you?",
    required: true,
    options: [
      { value: "words",    label: "Heartfelt words",    emoji: "💌" },
      { value: "gestures", label: "Helpful gestures",   emoji: "🙌" },
      { value: "physical", label: "Physical affection", emoji: "🫶" },
      { value: "presents", label: "Meaningful presents", emoji: "🎁" },
      { value: "time",     label: "Time well spent",    emoji: "⏰" },
    ],
  },
  {
    id: "relationship-feel",
    kind: "single-choice",
    title: "How do you want your relationship to feel?",
    required: true,
    options: [
      { value: "meaningful",  label: "Close and meaningful",    emoji: "🤝" },
      { value: "exciting",    label: "Exciting and playful",    emoji: "🎢" },
      { value: "harmonious",  label: "Harmonious and strong",   emoji: "🕊" },
      { value: "passionate",  label: "Full of passion and energy", emoji: "🔥" },
      { value: "grounded",    label: "Grounded and secure",     emoji: "🔒" },
      { value: "growing",     label: "Growing together",        emoji: "🌱" },
      { value: "other",       label: "Something else",          emoji: "✨" },
    ],
  },
  {
    id: "love-worry",
    kind: "single-choice",
    title: "Your main worry when it comes to love?",
    required: true,
    options: [
      { value: "broken-trust",   label: "Broken trust",         emoji: "🌵" },
      { value: "distance",       label: "Emotional distance",   emoji: "📦" },
      { value: "understanding",  label: "Lack of understanding", emoji: "❓" },
      { value: "commitment",     label: "Commitment issues",    emoji: "🔒" },
      { value: "opening-up",     label: "Fear of opening up",   emoji: "🛡" },
      { value: "heartbreak",     label: "Heartbreak",           emoji: "💔" },
      { value: "other",          label: "Something else",       emoji: "🎭" },
    ],
  },
  {
    id: "future-together",
    kind: "single-choice",
    title: "What's the future you hope to create together?",
    required: true,
    options: [
      { value: "family",    label: "Peaceful family life",       emoji: "🏠" },
      { value: "adventures", label: "Adventures around the globe", emoji: "🌍" },
      { value: "growing",   label: "Growing together",           emoji: "🌱" },
      { value: "financial", label: "Financially secure",         emoji: "💰" },
      { value: "impact",    label: "Changing the world",         emoji: "💫" },
    ],
  },
  { ...FORECAST_67, id: "forecast-2" },
  PALM_PHOTO_STEP,
  PLAN_READY_STEP,
  FORECAST_100,
  FINAL_STEP,
];

// ─── Astrocartography (14 steps) ──────────────────────────────────────────────

const ASTROCARTOGRAPHY_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    kind: "intro",
    title: "Discover where you're meant to feel happy",
    subtitle:
      "Complete a 1-minute quiz to get a personalized prediction. The result is not guaranteed and may vary from case to case",
    options: [
      { value: "female",     label: "Female",     emoji: "♀" },
      { value: "male",       label: "Male",       emoji: "♂" },
      { value: "non-binary", label: "Non-binary", emoji: "⊕" },
    ],
  },
  {
    id: "advisor-intro",
    kind: "advisor-intro",
    title: "I'll help you find a place that soothes your soul",
    ctaLabel: "Continue",
  },
  BIRTH_DATE_STEP,
  BIRTH_TIME_STEP,
  BIRTH_PLACE_STEP,
  {
    id: "video-story-1",
    kind: "video-story",
    title: "Your astrocartography lines",
    videoStoryLines: [
      "Each line represents a different planetary energy across the globe.",
      "Jupiter line brings expansion and growth — whether it's career success, travel, or just a greater sense of confidence and joy",
    ],
    ctaLabel: "Continue",
  },
  RELATIONSHIP_STATUS_STEP,
  GOALS_STEP,
  {
    id: "energy-places",
    kind: "single-choice",
    title: "Did you feel like your energy was changing in some places?",
    required: true,
    options: [
      { value: "yes",         label: "Yes",           emoji: "👍" },
      { value: "no",          label: "No",            emoji: "👎" },
      { value: "complicated", label: "It's complicated", emoji: "🤔" },
    ],
  },
  LIFE_CHALLENGES_STEP,
  {
    id: "video-story-2",
    kind: "video-story",
    title: "Moon & Venus lines",
    videoStoryLines: [
      "Once your map is ready, focus on the Moon and Venus lines — they align best with your goals",
    ],
    ctaLabel: "Continue",
  },
  {
    id: "palm-photo-astro",
    kind: "palm-photo",
    title: "Take a photo of your left palm",
    subtitle:
      "Let's explore your palm to discover what places inspire you. We value your privacy — swift deletion of non-identifiable data ensures anonymity",
    ctaLabel: "Take a photo",
  },
  { ...PLAN_READY_STEP, id: "plan-ready-astro" },
  FORECAST_100,
  FINAL_STEP,
];

// ─── export map ───────────────────────────────────────────────────────────────

export const ONBOARDING_CONFIG: Record<OnboardingCategorySlug, OnboardingCategoryConfig> = {
  moon: {
    slug: "moon",
    name: "Moon Guidance Onboarding",
    shortName: "Moon",
    accent: "#78e0ff",
    description: "Personalized moon cycle insights and emotional timing preview.",
    steps: cloneSteps(BASE_14_STEPS),
  },
  compatibility: {
    slug: "compatibility",
    name: "Compatibility Onboarding",
    shortName: "Compatibility",
    accent: "#ff7fb7",
    description: "Relationship compatibility preview before creating your account.",
    steps: cloneSteps(BASE_14_STEPS),
  },
  numerology: {
    slug: "numerology",
    name: "Numerology Onboarding",
    shortName: "Numerology",
    accent: "#f8c96a",
    description: "Core numbers and life path preview based on your profile.",
    steps: cloneSteps(BASE_14_STEPS),
  },
  "palm-reading": {
    slug: "palm-reading",
    name: "Palm Reading Onboarding",
    shortName: "Palm",
    accent: "#8af58f",
    description: "Palm line pre-check and interpretation teaser.",
    steps: cloneSteps(PALM_READING_STEPS),
  },
  "past-lives": {
    slug: "past-lives",
    name: "Past Lives Onboarding",
    shortName: "Past Lives",
    accent: "#c9a7ff",
    description: "Karmic profile preview and past-life pattern onboarding.",
    steps: cloneSteps(PAST_LIVES_STEPS),
  },
  astrocartography: {
    slug: "astrocartography",
    name: "Astrocartography Onboarding",
    shortName: "Astrocartography",
    accent: "#7be1ff",
    description: "Location-based destiny line preview and city alignment flow.",
    steps: cloneSteps(ASTROCARTOGRAPHY_STEPS),
  },
  sketch: {
    slug: "sketch",
    name: "Soulmate Sketch Onboarding",
    shortName: "Sketch",
    accent: "#ffb3a3",
    description: "Visual preference journey for soulmate sketch generation.",
    steps: cloneSteps(SKETCH_STEPS),
  },
};

export function isOnboardingCategorySlug(value: string): value is OnboardingCategorySlug {
  return (ONBOARDING_CATEGORIES as readonly string[]).includes(value);
}

export function getOnboardingCategoryConfig(value: string): OnboardingCategoryConfig | null {
  if (!isOnboardingCategorySlug(value)) return null;
  return ONBOARDING_CONFIG[value];
}
