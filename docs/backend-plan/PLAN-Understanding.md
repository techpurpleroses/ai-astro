# AstroAI Plan Understanding Guide

## Purpose of This File
This file explains [`PLAN.md`](c:\Purple Roses Technology\SaaS Projects\Astro-AI\astro-ai-repo\docs\backend-plan\PLAN.md) in simple language.

`PLAN.md` is the technical build plan.

This file is the human explanation of that plan.

It is written for:

- founders
- product owners
- non-technical stakeholders
- anyone who wants to understand what the backend is doing without reading engineering language only

The goal is simple:

- keep the technical words
- explain what each technical word means in normal language
- show real examples of how the app will behave

## Quick Glossary

Before reading the full explanation, these are the most important technical words in plain language.

| Technical term | Layman meaning |
|---|---|
| Backend | The hidden system behind the app that stores data, talks to APIs, checks subscriptions, and prepares responses for the app screens. |
| Frontend | What the user sees: pages, cards, charts, tabs, buttons, dashboard. |
| BFF (Backend For Frontend) | A special backend layer that prepares data exactly in the shape the frontend screen needs. Think of it like a waiter who brings the food already plated for each customer. |
| Supabase | Our main database and backend platform. This is where our app data lives. |
| Provider | An outside company or API we call to get astrology calculations or other external data. Here, the main astrology provider is `astrology-api.io`. |
| Canonical data | Our clean, standard internal version of data. Even if providers change, we keep our own stable format. |
| Artifact | A finished output saved by our app, like a daily horoscope card, tarot draw result, report, or soulmate result. |
| Seed data | Data we prepare once and store ourselves, like tarot cards, advisor profiles, story articles, and interpretation templates. |
| Cache | Saved results so we do not call the external API again and again. This saves money and makes the app faster. |
| TTL (Time To Live) | How long cached data stays valid before it should refresh. |
| Async job | Work done in the background instead of making the user wait on the page. |
| Entitlement | A rule that checks what the user is allowed to access based on subscription or purchase. |
| RLS (Row Level Security) | A database rule that says one user cannot read another user's private records. |
| DTO / Contract | The exact data shape the frontend expects. It is like a form template the backend must fill correctly every time. |
| Provider payload | The raw answer we get from the external API. We do not want the frontend to depend on this directly. |
| Contract version | A version label like `v1` that tells us which response shape the backend is building. |
| Subject version | A version number or fingerprint for a subject's astrology-relevant profile data. |
| Execution class | A fixed rule for how a feature runs: DB-only, inline refresh, stale-while-revalidate, or async-only. |
| Provenance | Background metadata that explains where a result came from and which inputs or versions created it. |
| Mutable cache | Saved data that can be refreshed and replaced. |
| Immutable artifact | Saved data that should remain as historical record and not silently change later. |
| Degradation mode | A safety mode used when budget is low or providers are failing, so the app becomes stricter and more cache-driven. |

## One-Sentence Understanding of the Whole Plan
The plan says:

AstroAI will use Supabase as its main brain and memory, use `astrology-api.io` only for the astrology facts we really need, save and reuse results carefully to reduce cost, and serve the dashboard through our own stable backend so the frontend never breaks if we change providers later.

Real-life example:

- A user named Aisha opens the Today dashboard.
- AstroAI first checks its own database.
- If today's horoscope is already saved and still fresh, it returns it instantly.
- If not, AstroAI fetches facts from the provider, stores them in its own format, builds the final dashboard card, saves it, and shows it.
- Tomorrow, the app can refresh again.

That is the core logic behind the whole plan.

## Section-by-Section Explanation of `PLAN.md`

## 1. Summary

### Plan line
`This file is the implementation-facing source of truth for the AstroAI authenticated dashboard backend.`

### Layman meaning
This means `PLAN.md` is the main file engineers should follow when building the dashboard backend.

It avoids confusion from older notes, trial ideas, or outdated files.

### Real example
Suppose one old document says "use Provider A" and another says "use Provider B".

If `PLAN.md` says "use `astrology-api.io` as baseline", then that is the final instruction.

### Plan line
`The dashboard will use a server-first BFF architecture.`

### Layman meaning
The app screens should not build complicated data on the user's device. Our backend should prepare the screen-ready data and send it already organized.

### Real example
Instead of the Today page calling five APIs directly and mixing the results inside the browser, the frontend just asks:

- "Give me the Today dashboard data"

and the backend returns:

- horoscope card
- moon section
- daily readings
- event of the day

already prepared in one response.

### Why this matters
- safer
- faster
- less frontend complexity
- easier to swap providers later

## 2. Document Status

This section explains which documents are still active and which ones are old.

### Active reference documents
These are supporting documents that still matter.

Layman meaning:
These are like approved reference papers.

If a developer wants more detail about provider pricing, auth setup, storage rules, or hardening, they should check these files.

### Historical or comparison-only documents
These are old or comparison files.

Layman meaning:
They are useful for background understanding, but not safe to build from now.

### Real example
If an old `.docx` says:

- "use Swiss Ephemeris"

but the new plan says:

- "use `astrology-api.io` as baseline"

then the old file is only history. It is not a build instruction anymore.

### Why this matters
Without this separation, an engineer can accidentally build from the wrong file and create the wrong system.

## 3. Core Architecture Decisions

This is one of the most important sections.

It answers:

- where different kinds of data should live
- who owns what
- what should come from the database
- what should come from external APIs

### Data ownership

The plan splits the system into separate logical rooms.

Think of it like a house:

- one room for facts
- one room for finished outputs
- one room for reusable written content
- one room for chat
- one room for raw API logs

This is cleaner than throwing everything into one big room.

### `astro_core = canonical structured astrology facts`

Layman meaning:
This is the place where AstroAI stores the clean astrology truth in its own internal format.

Examples:

- birth chart snapshot
- moon phase data
- compatibility facts
- daily transit facts

### Real example
If the provider says:

- `planetary_positions`

and another provider later says:

- `bodies`

AstroAI should still store both as the same internal concept in `astro_core`.

That way, the frontend does not care which provider we use.

### `astro_artifacts = rendered dashboard outputs`

Layman meaning:
This is where AstroAI stores the final outputs shown to users.

Examples:

- today's final horoscope card text
- a saved tarot draw result
- a saved soulmate artifact
- a saved palm reading output

Think of `astro_core` as ingredients and `astro_artifacts` as the plated dish.

### `interpretation = reusable authored text, rules, and template resolution`

Layman meaning:
This is where our own writing logic lives.

Examples:

- explanation templates
- category wording
- ritual text
- reusable rule-based sentences

This is important because some providers give calculation facts but poor wording, or wording we do not want to fully depend on.

### `chat = advisors, sessions, messages, report catalog`

Layman meaning:
All advisor-related business should stay together.

Examples:

- advisor profiles
- user conversation history
- advisor report offerings

### `provider_ingestion = raw provider audit/debug only`

Layman meaning:
This stores the raw answers from external APIs, but users never directly see this.

### Real example
If tomorrow the horoscope looks wrong, engineering can inspect:

- what request was sent
- what raw response came back
- how it was mapped into AstroAI's own format

That helps debugging.

### Very important tightening rule: fact is not the same as interpretation

This was one of the most important follow-up improvements to the plan.

Layman meaning:

- provider facts are one thing
- provider text is another thing
- our own text is another thing
- the final user-facing output is another thing

The app must not mix these carelessly.

### Real example
Suppose the provider returns:

- moon phase = waxing gibbous
- illumination = 74 percent
- plus a paragraph of interpretation text

Correct handling:

- save the structured values as facts
- keep the provider paragraph only as raw input or reference
- build AstroAI's final user-facing output separately

Wrong handling:

- saving provider prose as if it were permanent internal truth

That would create long-term confusion later.

## 4. Rendering Rule

This section explains how the backend should behave every time a page asks for data.

### Step 1. Read Supabase first
Layman meaning:
Always check your own saved data before calling an outside API.

### Real example
If a user opens Today's page 10 times in the same day, the app should not spend provider credits 10 times.

It should fetch once, save once, reuse many times.

### Step 2. If fresh, return immediately
Layman meaning:
If saved data is still valid, use it.

### Step 3. If missing or stale
Layman meaning:
Only then call the provider or do extra work.

The plan separates:

- cheap work = okay to do immediately
- expensive work = send to background job

### Real example
Cheap:

- fetch today's moon metrics

Expensive:

- generate a premium report
- generate soulmate image

For expensive work, the user should see:

- "processing"

instead of waiting too long on one request.

### Step 4. Persist everything important
Layman meaning:
After external data is fetched, do not throw it away.

Save:

- what was requested
- what the provider answered
- what AstroAI stored as facts
- what final artifact was shown

This helps:

- debugging
- analytics
- cost control
- future provider switching

## 5. Anti-Conflict Rules

These are rules designed to prevent future mess.

### `Frontend must not import src/data/* after migration`

Layman meaning:
The frontend should stop reading local mock files once real backend integration is done.

Those files may remain in the repo as seeds, but not as live app data.

### Real example
Right now a story page may read story text directly from `src/data/stories.ts`.

After migration, the story page should fetch story content from the database-backed backend.

### `Provider field names must never reach frontend contracts`

Layman meaning:
Do not let the frontend depend on weird provider-specific names.

### Real example
If provider returns:

- `scoreDescription`

our backend can still expose:

- `compatibilitySummary`

or map it into the existing AstroAI DTO.

Then if the provider changes later, the frontend stays stable.

### `Do not store the same concept in multiple runtime locations`

Layman meaning:
Do not duplicate the same live data in many places.

### Real example
If today's horoscope exists in:

- a local JSON file
- a database table
- and a second fallback cache

then eventually those copies will disagree.

The plan avoids that.

### `All timestamps are stored in UTC`

Layman meaning:
Always save time in one global standard format.

Then convert it later to a user's local timezone when needed.

### Real example
A user in India opens the app at 8:00 AM IST.
A user in New York opens it at 10:30 PM EST.

If the app stores time inconsistently, today's reading can become tomorrow's reading by mistake.

Saving UTC avoids this confusion.

## 6. Frontend Contract Rule

This means:

- keep the existing frontend data shapes stable
- change the backend behind the scenes

### Real example
If the Today page currently expects:

- `horoscope`
- `moon`
- `dailyReadings`

then the backend should continue sending data in that same expected shape.

This is important because otherwise we would have to rewrite many UI components and create regression risk.

### New tightening rule: contracts should stay versioned

Layman meaning:
Even if the current app uses one response shape today, we should still label it as `v1`.

Why:

- future redesigns may need `v2`
- mobile app may need a slightly different response later
- experiments may add new fields without breaking the current screen

So "preserve the current DTO" is good for migration, but it should still become an official versioned contract.

## 7. Dashboard Data Plan

This part answers:

- what type of data is saved where
- what is reusable
- what is personalized
- what is just raw external input

### Canonical astrology facts
These are the clean, reusable facts.

Examples:

- natal chart
- transit facts
- compatibility facts
- numerology facts

These are the foundation layer.

### Rendered dashboard outputs
These are ready-to-show outputs.

Examples:

- the final daily horoscope shown on Today page
- saved tarot draw result for a user
- palm result for a user

### Reusable authored and common content
These are things we write or prepare once and reuse many times.

Examples:

- tarot card meanings
- magic ball answers
- story articles
- advisor profiles

This is very important because these do not need expensive provider calls every time.

### Platform and business state
These are non-astrology but essential business records.

Examples:

- user profile
- subscription status
- feature jobs
- analytics events

### Raw provider data
These are the external raw responses for internal use only.

The app should not show these directly to users.

## 8. Feature-by-Feature Dashboard Plan

This is the most product-specific section.

It explains screen by screen where data will come from.

## Today primary horoscope

### Plan decision
Use:

- `astro_artifacts.daily_horoscope_artifacts`
- provider personal daily horoscope first
- fallback to sign daily horoscope

### Layman meaning
If we know the user's birth details, give a more personalized horoscope.

If we do not know them yet, give a simpler sign-based version.

### Real example
User 1:

- has birth date, time, and location saved

Then AstroAI asks the provider for a more personal daily reading.

User 2:

- only selected zodiac sign during onboarding

Then AstroAI shows a sign-based fallback reading.

## Today category cards

### Layman meaning
These are cards like:

- love
- career
- health
- day guidance

The plan says the provider may give base facts or base text, but AstroAI should shape the final wording itself through templates and rules.

### Why this matters
This gives product consistency.

The app keeps its own tone and structure instead of blindly trusting provider wording.

This is also where the "fact vs interpretation" rule matters:

- provider prose may help
- but it is not canonical truth
- AstroAI still owns the final assembled output

## Today moon section

### Layman meaning
Moon facts come from the astrology provider, but the explanation shown to users can still be our own style.

### Real example
Provider gives:

- phase
- illumination
- age
- moonrise

AstroAI then writes or selects:

- "This is a better day for reflection than initiation."

from templates.

## Today events and retrogrades

### Layman meaning
Provider gives the astronomy/astrology movement facts.

AstroAI turns them into understandable guidance.

### Real example
Provider fact:

- Mercury square Moon
- Venus retrograde

App output:

- "Communication may feel emotionally charged today."

The fact comes from provider.
The readable app phrasing comes from AstroAI logic.

## Today daily readings strip

### Layman meaning
This is a bundle of smaller daily widgets.

Examples:

- tarot card of the day
- lucky insight
- quick numerology note
- love tip

The plan says most of this should be built in-house and cached, not repeatedly bought from external APIs.

## Magic ball

### Layman meaning
This is fully internal.

We do not need astrology provider credits to return:

- "Yes"
- "Not now"
- "Ask again later"

This is just a curated pool with selection rules.

## Birth chart

### Chart tab
The provider calculates the natal chart.

AstroAI stores it in canonical format.

The frontend sees only AstroAI's stable chart format.

### Daily transits
These are personalized for the user and change over time, so they should be cached for the day and refreshed when needed.

## Compatibility

### Quick compatibility
The plan says quick compatibility exists in `v1` and is based on sign-pair scores that are precomputed and stored.

### Layman meaning
Do not call the provider every time someone compares Aries and Libra.

Save the score once and reuse it.

### Best matches
These can be generated from saved pair data instead of fresh provider calls.

### Today's matches
These are more product-owned.

Layman meaning:
AstroAI decides today's ranking by combining:

- compatibility matrix
- current transits
- moon context

This makes the experience feel alive without spending provider credits every click.

### Deep report
The plan also says deep compatibility exists in `v1`, but it is a different product from quick compatibility.

Layman meaning:
This is where AstroAI looks at two real people as subjects, not just two zodiac signs.

Real-life example:

- quick compatibility = "Are Leo and Gemini usually a good match?"
- deep compatibility = "Rahul and Meera, based on both real birth details, where do they align and where will they clash?"

That is why these two must never be mixed.

Practical meaning:

- quick compatibility is for fast browsing and match discovery
- deep compatibility is for a detailed personal reading
- both exist from `v1`
- they must be stored and explained as different things

## Advisors

### Advisors list
Advisor profiles are seeded and stored in the database.

Layman meaning:
This is our own content, not external astrology provider content.

### Advisor chat
OpenAI is used here.

Important meaning:
The user chat experience is AI-driven, but the app should provide the AI with cached astrology context from Supabase, not constantly call the astrology provider in every message.

### Real example
User asks:

- "Why do I feel emotionally off this week?"

OpenAI can answer using:

- user's saved chart
- current saved transits
- advisor persona prompt

without making a new astrology provider call just for that one message.

## Settings and owned reports

This section separates:

- report catalog
- user ownership
- generated report output

Layman meaning:
One table says what products exist.
Another says what the user owns.
Another stores the finished generated result.

This avoids messy mixing of catalog and purchased data.

## Story hub

This is fully editorial and should live in Supabase.

Layman meaning:
Stories are our own content, like an internal mini magazine.

No provider call should be needed to open a story article.

## Tarot baseline

This is an important plan decision.

The provider does have tarot endpoints, but the plan says they are not baseline.

### Layman meaning
Tarot in the main dashboard should work using our own stored deck and saved user draws first.

Why:

- cheaper
- more controllable
- easier to keep consistent

Provider tarot can be enabled later behind a feature flag if needed.

## Palm reading

Palm should use:

- Roboflow for image detection
- internal interpretation rules for meaning

### Layman meaning
The image recognition comes from Roboflow.
The final interpretation and product output remain ours.

This avoids expensive provider palmistry usage in the core path.

## Soulmate

The text side should mostly rely on:

- saved chart facts
- saved compatibility facts
- internal templates

OpenAI is used mainly for the image/sketch generation.

### Real example
User requests soulmate result.

AstroAI:

1. reads user's chart
2. reads saved compatibility or pattern logic
3. creates or selects the narrative output
4. uses OpenAI only to generate the sketch image

This keeps AI usage narrower and more controlled.

## 9. Provider Budget and Freshness Policy

This section is about money and safety.

The astrology provider is not cheap, so we need a spending discipline.

### Monthly baseline provider budget = 7,000 credits

Layman meaning:
This is the total external astrology call budget for the month under the current plan.

### Daily ceiling target = 220 credits/day

Layman meaning:
If the system spends too much on one day, the month can be exhausted early.

So the plan sets a daily safe target.

### Budget thresholds

#### 60 percent warning
Meaning:
The system starts raising warning signals internally.

#### 80 percent protection mode
Meaning:
The system begins restricting nonessential provider use.

#### 95 percent emergency mode
Meaning:
Only the most important flows should continue using provider credits.

### Real example
Suppose many users suddenly start opening compatibility and birth chart pages repeatedly.

If the system detects usage is going too high:

- it can stop optional refreshes
- keep using cached data
- avoid expensive features temporarily

This prevents full quota exhaustion.

### Freshness policy

This section explains how often different data types should refresh.

### Real example
Natal chart does not change every day.
It should only change if the user's birth details change.

But moon metrics do change much more often, so their TTL is much shorter.

This prevents both:

- unnecessary API spend
- stale daily data

### New tightening rule: degradation behavior must be defined in advance

Layman meaning:
It is not enough to say "we have warning levels."

We must also decide:

- what the app stops doing at 80 percent usage
- what becomes cache-only at 95 percent usage
- which features are critical and which are optional

### Real example
If provider budget is almost exhausted, the app should not let each engineer invent a different emergency behavior.

Instead, it should already know:

- use stale daily data
- stop optional refreshes
- pause nonessential premium generations

That makes the system predictable.

### Paid feature exception policy

Layman meaning:
When provider budget is low, optional and free things should pause first. Things the user already paid for should get higher priority.

### Real example
If the system is in emergency budget mode:

- free refreshes may pause
- optional previews may pause
- but an already-purchased premium generation may still be accepted by the backend, placed into a delayed queue, and returned with a delayed status instead of being silently refused

## 10. Dashboard BFF Contracts

This section says the frontend should stop calling many low-level routes and instead use screen-based backend routes.

### Layman meaning
Each screen gets one main endpoint designed for that screen.

### Real example
Instead of this:

- call horoscope route
- call moon route
- call events route
- call tarot route

the Today page can call:

- `GET /api/dashboard/today`

and get one clean response containing everything it needs.

This reduces frontend complexity and future breakage.

### Important detail for the Features page
The Features dashboard endpoint should not become a random bundle of unrelated queries.

Layman meaning:
Even if it shows many different cards, it should still behave like one intentional product response, not a messy collector of whatever data was easiest to fetch.

## 11. Internal Backend Layering

This is about code organization.

### `foundation`
Reusable base tools.

Examples:

- DB helpers
- auth helpers
- common utilities

### `integrations`
Code that talks to outside services.

Examples:

- astrology provider client
- Roboflow client
- OpenAI client
- Stripe client

### `products/astroai`
AstroAI-specific business logic.

Examples:

- mapping provider chart into AstroAI chart shape
- building Today dashboard response
- deciding compatibility ranking logic

### Why this matters
This makes reusable parts portable for future SaaS work and keeps AstroAI-specific logic in one product layer.

## 12. Authored Data and Seed Ownership

This section says what should be written or curated by us and stored once.

### Seed once and store in Supabase

Examples:

- advisors
- tarot cards
- magic ball pool
- story content
- interpretation templates

### Layman meaning
These are not supposed to be generated live every time a user opens a page.

They are product assets.

### Real example
A tarot card meaning like:

- "The Fool represents fresh starts and bold movement"

should be stored once as core content, not recreated every day.

## Important Rules Added After Risk Review

This section explains the most important tightening rules added after validating the plan for loopholes and long-term conflicts.

### Subject timezone must be authoritative

Layman meaning:
The app needs clear timezone ownership for both birth logic and daily-life logic.

In this project, we are now choosing two separate fields from the start:

- one for birth-based astrology context
- one for current daily personalization timezone

Simple meaning:

- birth timezone helps the app understand the original birth context correctly
- personalization timezone decides what counts as "today" on the dashboard

This avoids overloading one field with two different jobs.

### Real example
If a user was born in Mumbai, now lives in Dubai, and is traveling in New York:

- birth-based chart logic should still follow the stored birth context
- daily horoscope and "today" should follow the chosen personalization timezone

That is why the plan now keeps these as separate fields from the start.

### Subject version is needed

Layman meaning:
When astrology-relevant profile data changes, the app should treat that as a new subject context version.

### Real example
If the user changes:

- birth time
- birth place
- timezone

then chart-dependent results created before that change may no longer be valid.

### Invalidation must be precise

Layman meaning:
Not every profile edit should wipe every astrology cache.

### Real example
Changing display name should not rebuild the natal chart.

Changing birth time should rebuild:

- natal chart
- transits
- compatibility-dependent outputs
- soulmate-dependent outputs

Because the plan now uses two separate timezone meanings from the start:
- changing only personalization timezone should refresh daily outputs
- it should not automatically mean the birth chart itself changed

### Execution classes remove backend confusion

Layman meaning:
Each feature should have one fixed operating mode.

Examples:

- DB-only
- refresh inline on miss
- stale-while-revalidate
- async-only

This prevents different developers from making different hidden assumptions for the same feature.

### Mutable cache vs immutable artifact

Layman meaning:
Some saved data can be refreshed in place.
Some saved data should stay as historical record.

### Real example
Today's lightweight dashboard cache can refresh.

But a paid report should not silently become a different result later without a clear product reason.

Tie-break rule in simple language:

If a user can revisit, compare, share, purchase, or emotionally care about a result, save a historical copy even if the app also keeps a latest cache copy.

### Compatibility meaning must stay separated

Layman meaning:
Quick sign compatibility and deep personal compatibility are not the same thing.

### Real example
"Leo + Gemini quick score" is not the same as:

- a full subject-pair compatibility result using both real birth charts

If these meanings are mixed, both users and engineers get confused.

Simple rule:

in v1, the main compatibility facts table means sign-pair compatibility only

Deep compatibility also exists in `v1`, but it must live in a separate subject-pair domain or clearly separate entity type.

This means:

- quick = one shared sign-pair fact system
- deep = one personal subject-pair report system

They must not be blended into one vague "compatibility" bucket.

Extra clarity:

Even though the table name looks broad, the working meaning must stay narrow.

So in code and docs, people should keep saying:

- sign-pair compatibility

instead of casually saying:

- compatibility in general

That discipline prevents future confusion.

### Advisor chat needs replayable context

Layman meaning:
When the AI replies, the system should know later:

- which chart version it used
- which prompt or template version it used
- which saved facts were given to it

That makes support and debugging much safer.

### AI regeneration should be append-only

Layman meaning:
If the user regenerates an answer, the old answer should stay and the new one should be added as a new response with its own context record.

That keeps conversation history trustworthy.

### Provider text is input, not truth

Layman meaning:
Even when the provider gives interpretation text, AstroAI should treat that as outside input, not permanent internal truth.

## 13. Repo-to-Seed Migration Rule

This means the repo files that currently hold mock data should become seed sources only.

### Layman meaning
They can help populate the database once, but should not stay connected to live runtime screens.

### Real example
Today the reports page may import report data directly from:

- `src/data/reports.ts`

After migration:

- that file is just a source for seed insertion
- the live page reads report catalog from Supabase

### Naming discipline still matters

Some current table names are acceptable, but slightly broader than their real meaning.

Examples:

- `astro_core.compatibility_facts`
- `chat.advisor_report_products`
- `astro_artifacts.story_*`

Layman meaning:

The storage label may be old or broad, but runtime code should still use precise business meaning.

Real-life example:

If a warehouse shelf is labeled "supplies," but one box is actually only for printer paper, staff should still treat that box as printer paper only.

That is the same idea here:

- stories should be treated as editorial content
- advisor report products should be treated as report catalog data
- compatibility facts should be treated as sign-pair facts only

## 14. Hardening and Launch Controls

This is the production safety section.

It is one of the most important sections for a real SaaS.

## Control-plane tables already present

This means the database already has many safety structures built.

Examples:

- idempotency keys
- feature flags
- usage events
- usage counters
- analytics
- jobs
- dead-letter jobs
- moderation events
- incident pins

### Layman meaning of key items

#### Idempotency
If the same request is accidentally sent twice, the system should not create the same result twice.

Real example:
User clicks "Generate soulmate" two times very fast.
We should not bill twice or create duplicate jobs.

#### Feature flags
These are on/off switches for features.

Real example:
If tarot backend is not fully ready, product can hide or disable the feature without changing the rest of the system.

#### Usage events and counters
These track how often features are used.

Real example:
How many compatibility checks happened today?
How many palm scans happened this week?

#### Feature jobs
These are background jobs to process heavy work.

#### Dead-letter jobs
These are failed jobs that need attention instead of disappearing silently.

Real example:
A soulmate generation fails because OpenAI times out.
That failed job should be recorded so the team can inspect or retry it.

#### Moderation events
These track unsafe or flagged AI/chat content.

#### Incident pins
These are records kept for important debugging or operational incidents so they are not auto-deleted too early.

## Required runtime wiring still pending

This means the database support exists, but actual backend behavior still needs to be connected.

Examples:

- checking who is allowed to use a premium feature
- preventing duplicate generate requests
- running background workers
- wiring alerts
- applying provider budget controls at runtime

This is the difference between:

- table exists

and

- feature is actually enforced in live backend behavior

### New tightening rule: duplicate generation must be prevented by natural keys

Layman meaning:
It is not enough to say "we have jobs."
We must also prevent the same real-world request from creating multiple duplicate results.

### Real example
If a user clicks soulmate generation 3 times, the system should understand:

- "this is the same request"

and avoid charging or generating the same semantic result 3 times.

### Subject version must have one owner

Layman meaning:
One central mechanism must decide when subject version changes. Different backend services should not invent their own version change logic.

In this plan, the safest rule is:

- database-side trigger or one central backend write path owns subject version mutation

not the frontend and not random services.

## Async-only features

These are features that should run in background instead of blocking the user.

Examples:

- soulmate generation
- premium report generation
- heavy palm post-processing

### Real example
User clicks "Generate soulmate sketch".

Correct flow:

1. request is accepted
2. background job starts
3. user sees progress or pending state
4. result appears later

Wrong flow:

1. user waits 40 seconds on one frozen request

The plan avoids the wrong flow.

## 15. Implementation Sequence

This section gives the order of work.

### Step 1. Freeze frontend DTO contracts
Meaning:
First lock what the frontend expects so backend integration does not break the UI.

### Step 2. Build dashboard read-model services
Meaning:
Create backend logic that combines:

- Supabase facts
- artifacts
- provider calls
- templates

into final screen-ready responses.

### Step 3. Wire BFF routes
Meaning:
Build the screen-level endpoints.

### Step 4. Replace hooks reading `src/data/*`
Meaning:
Move the UI from mock/static data to real backend responses.

### Step 5. Move shared content into Supabase seeds
Meaning:
Put stories, tarot deck, advisors, reports, and templates into the database.

### Step 6. Add cache invalidation on subject updates
Meaning:
If the user changes birth data, the app must refresh dependent results.

### Step 7. Turn on budget guards, jobs, observability
Meaning:
Before wider launch, add the production safety controls.

## 16. Test Plan

This section explains what must be proven before trusting the system.

## Contract and regression tests

### Layman meaning
Make sure the frontend still receives the exact data shape it expects.

### Real example
If the compatibility page expects `bestMatches`, backend cannot suddenly rename it without updating the app.

## Data correctness tests

### Layman meaning
Make sure data refreshes and relationships behave correctly.

### Real example
If a user changes their birth time, old chart, compatibility, and transit data should not keep showing.

## Security and access tests

### Layman meaning
Users must not see each other's private data.

### Real example
User A should never be able to open User B's palm report or advisor chat history.

## Cost and resilience tests

### Layman meaning
The system should behave safely when:

- provider quota is low
- provider fails
- background jobs fail

### Real example
If the provider API times out, the app should prefer showing the last valid cached result instead of crashing.

Another important test is partial success.

### Real example
If the Today page has 5 sections and only 1 provider subcall fails, the whole page should not necessarily go blank.

The backend should know whether to:

- show stale data for that section
- return partial status
- keep the rest of the page working

That should not exist only as a test idea.

It should be a runtime product rule for big combined pages like the Today dashboard.

## 17. Assumptions and Defaults

This section lists what the plan is officially assuming right now.

Examples:

- onboarding is separate
- `astrology-api.io` is baseline provider
- only live-validated endpoints are allowed in baseline
- palm is Roboflow plus internal interpretation
- OpenAI is limited to advisor chat and soulmate image generation

### Why this matters
This makes the plan explicit.

If later the business chooses something different, the team can update the assumption intentionally instead of drifting silently.

## Practical End-to-End Scenarios

## Scenario 1: User opens Today page

User:

- Meera
- logged in
- has full birth data saved

Flow:

1. frontend calls `GET /api/dashboard/today`
2. backend checks Supabase for today's saved artifact
3. if fresh, return it
4. if not fresh, backend checks provider budget policy
5. backend calls validated horoscope and moon endpoints
6. backend maps raw provider data into AstroAI format
7. backend builds final cards using interpretation templates
8. backend stores facts and final artifact
9. frontend receives one clean screen-ready response

Layman takeaway:
Meera sees one fast, stable Today dashboard, but behind the scenes the app is carefully saving money and keeping control of data.

## Scenario 2: User compares compatibility

User:

- Rahul
- wants to compare Leo and Gemini

Flow:

1. frontend calls compatibility endpoint
2. backend first checks if that sign-pair score already exists in `astro_core.compatibility_facts`
3. if yes, use it
4. if no, fetch from provider once, save it, reuse later

Layman takeaway:
The app does not waste credits repeating the same sign comparison over and over.

### Same area, different product

User:

- Rahul
- also wants a serious relationship reading with Meera using both real birth details

Flow:

1. frontend starts deep compatibility generation
2. backend treats it as a separate subject-pair product, not as a reuse of the quick sign score
3. backend stores the result as a durable artifact with its own provenance and history
4. later Rahul can revisit that deeper report without confusing it with the quick sign comparison

Layman takeaway:
The app has two different compatibility experiences from the start:

- a fast shared sign match
- a personal deep report

## Scenario 3: User chats with advisor

User:

- Sana
- asks the advisor why relationships feel unstable this week

Flow:

1. backend loads Sana's subject, chart facts, saved transits, and advisor profile
2. backend sends this context to OpenAI
3. advisor reply is generated
4. chat message is saved in `chat_messages`

Layman takeaway:
OpenAI handles the conversation, but the astrology context still comes from AstroAI's saved data, not uncontrolled live API calls every message.

## Scenario 4: User generates soulmate sketch

User:

- Daniel
- clicks generate soulmate

Flow:

1. backend checks entitlement and idempotency
2. job is created in `platform.feature_jobs`
3. background processing builds the text side from saved astrology facts
4. OpenAI generates the image
5. result is saved in `astro_artifacts.user_soulmate_artifacts`
6. frontend later reads the completed result

Layman takeaway:
The user does not sit waiting on one long request. The system handles it safely in the background.

## Final Practical Meaning of the Tightened Plan

After the loophole review, the plan became stricter in a good way.

It now says not only:

- where data should live
- which provider to use
- which features are async

but also:

- what counts as fact and what counts as interpretation
- what should be cache and what should be history
- which timezone officially controls "today"
- how the app knows a subject's astrology context changed
- how duplicate generation is prevented
- how the app degrades when provider budget is low
- how AI replies can be explained later

So the plan is no longer only a structure plan.

It is also an operations and safety plan.

## Final Plain-English Meaning of the Plan

If we reduce the whole backend plan into plain language, it means this:

AstroAI should own its product experience.

It should not become a thin wrapper around someone else's astrology API.

It should:

- use external providers only for the facts it needs
- save those facts in its own clean format
- prepare final dashboard outputs in its own structure
- write and own reusable content itself
- use AI only where it truly adds value
- protect cost, security, and scalability from the start

That is what this whole plan is trying to achieve.
