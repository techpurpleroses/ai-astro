# AstroAI Billing & Subscription System

> **Who this doc is for:** Everyone. The first half uses plain language for non-technical readers. The second half goes deep for developers. You can stop reading whenever you have what you need.

---

## Part 1 — Plain English: How It Works

### What does the billing system do?

The billing system controls who can use which features of AstroAI and how they pay for it. Think of it like a door with different keys:

- **Free users** get through the front door and can see basic features (daily horoscope preview, Big Three birth chart, daily tarot card, moon phases).
- **Pro users** have a full key that unlocks everything — personalized horoscopes, full birth charts, palm reading, soulmate sketch, deep compatibility reports.
- **Everyone** (free or pro) can buy **credit packs** to chat with AI advisors. One message costs one credit.

---

### The Two Plans

| | Free | Pro |
|---|---|---|
| Daily sign horoscope | Yes | Yes (personalized) |
| Moon phase + cosmic events | Yes | Yes |
| Big Three birth chart | Yes | Yes |
| Daily tarot card | Yes | Yes |
| Stories + Magic Ball | Yes | Yes |
| Full personalized horoscope | No | Yes |
| Full birth chart (all planets, houses) | No | Yes |
| Deep compatibility reports | No | Yes |
| Palm reading | No | Yes |
| Soulmate sketch | No | Yes |
| All tarot modes | No | Yes |
| Advisor chat | Credits (buy separately) | Credits (buy separately) |

---

### Pro Pricing (3 ways to subscribe)

| Option | Price | Best for |
|--------|-------|---------|
| Weekly | $6.99/week | Trying it out |
| Monthly | $19.99/month | Regular users |
| **Yearly** | **$99/year** | **Best value — saves $140 vs monthly** |

The app highlights the Yearly plan as the default recommendation.

---

### Credit Packs (for Advisor Chat)

Buying more credits at once gets you a better deal — this is intentional:

| Pack | Price | Cost per message |
|------|-------|-----------------|
| 50 credits | $9.99 | $0.20 each |
| 100 credits | $19.99 | $0.20 each (same — no deal) |
| **200 credits** | **$29.99** | **$0.15 each — Save 25%** |

The 100-credit pack is priced the same per-credit as the 50-pack on purpose. It makes the 200-pack look like the obvious best choice (this is called **decoy pricing**).

---

### The 3-Day Free Trial

New users who have never subscribed before get a **3-day free trial** on Pro. After 3 days, they're automatically charged the plan price they chose. The system remembers who has used a trial — each account gets exactly one, ever.

---

### What happens when someone cancels?

- **Cancelled by user** → They keep Pro access until their billing period ends (no immediate cutoff — they paid for that time).
- **Payment fails** → Stripe retries automatically. After retries fail, access is downgraded to Free.
- **Subscription deleted** → Immediate downgrade to Free.

---

### How advisor chat credits work

1. User sends a message → 1 credit is **immediately reserved** (deducted)
2. AI generates the response
3. If AI fails → the credit is **automatically refunded** (user is never charged for a broken session)
4. If AI succeeds → the deduction stands

Credits never expire and carry over month to month.

---

## Part 2 — Technical Reference

### System Architecture

```
User Browser
    │
    ├── usePlan() hook (TanStack Query, 5-min client cache)
    │       └── GET /api/billing/subscription
    │
    ├── <FeatureGate feature="birth_chart.full"> (frontend blur+overlay)
    │
    └── POST /api/astro/birth-chart
            ├── Auth (Supabase JWT)
            ├── getCachedEntitlement(userId)  ← Next.js unstable_cache, 5-min TTL
            ├── entitlementAllows(tier, feature)
            ├── checkRateLimitForUser(userId, planCode)  ← platform.check_user_rate_limit RPC
            └── AI service call
```

---

### Database Schema (Supabase)

All billing state lives in the `billing.*` schema. Platform ops in `platform.*`. User identity in `identity.*`.

#### `billing.plan_catalog`
Master list of plans. Rows: `free`, `pro`, `premium` (premium is archived/inactive).

```
plan_code | display_name | is_active | sort_order | metadata (color, badge)
```

#### `billing.plan_price_versions`
Stripe price catalog — one row per price. Supports versioning via `effective_from`/`effective_to`.

```
id | plan_code | stripe_price_id | lookup_key | currency | billing_interval | amount_minor | is_active
```

Active USD prices:
| lookup_key | stripe_price_id | Amount |
|------------|----------------|--------|
| `astroai_pro_weekly_usd` | `price_1TCzUZDgW4wAqiJswsbOGC75` | $6.99 |
| `astroai_pro_monthly_usd` | `price_1TCzUuDgW4wAqiJsnNeITlgn` | $19.99 |
| `astroai_pro_yearly_usd` | `price_1TCzVHDgW4wAqiJsNFRv3Vwk` | $99.00 |
| `astroai_credits_50_usd` | `price_1TCzXaDgW4wAqiJsvxLnl7yK` | $9.99 |
| `astroai_credits_100_usd` | `price_1TCzXeDgW4wAqiJsct9vdmti` | $19.99 |
| `astroai_credits_200_usd` | `price_1TCzXhDgW4wAqiJstmQis23b` | $29.99 |

Unique index: `uq_plan_price_versions_active_open` on `(plan_code, currency, billing_interval, billing_interval_count)` WHERE active AND not expired AND billing_interval != 'one_time'. One-time prices use a separate index on `lookup_key`.

#### `billing.subscriptions`
One row per Stripe subscription. Updated by webhook events.

```
id | user_id | plan_code | status | current_period_start | current_period_end
   | cancel_at_period_end | provider | provider_subscription_id | metadata
```

Status values: `trialing`, `active`, `past_due`, `canceled`, `paused`, `incomplete`

Access is granted only for `active` or `trialing`. Everything else = Free tier.

#### `billing.credit_transactions`
Append-only ledger — never updated, only inserted. Current balance = `balance_after` of the latest row.

```
id | user_id | tx_type | amount | balance_after | reference_type | metadata | created_at
```

`tx_type` values: `purchase`, `session_charge`, `refund`, `bonus`, `adjustment`, `expiration`

#### `identity.profiles`
Extended user profile. Billing-relevant columns:

```
stripe_customer_id  — Stripe cus_xxx (one per user, written by webhook/checkout)
has_used_trial      — boolean, set to true after first subscription created
```

#### `platform.idempotency_keys`
Prevents duplicate processing and double checkout sessions.

```
scope | idempotency_key | status | response_hash | expires_at
```

Used for:
- Stripe webhook events (`scope=stripe_webhook`, key=`event.id`)
- Checkout sessions (`scope=checkout`, key=`checkout:{userId}:{lookupKey}`, `response_hash`=session URL)

#### `platform.usage_counters`
Per-user daily API call counters for rate limiting.

```
window_key (YYYY-MM-DD) | scope | user_id | counter
```

Unique index on `(window_key, scope, coalesce(user_id, uuid_nil), coalesce(ip_hash,''), coalesce(feature_key,''))`.

---

### Key Source Files

| File | Purpose |
|------|---------|
| `src/server/foundation/modules/billing/service.ts` | All DB reads/writes for billing state |
| `src/server/foundation/modules/billing/cached-entitlement.ts` | Per-user Next.js cache wrapper (prevents multi-user data leak) |
| `src/server/foundation/modules/billing/entitlement-check.ts` | `requirePlan()` + `softPaywallResponse()` helpers for API routes |
| `src/server/foundation/modules/billing/rate-limiter.ts` | Global daily rate limit check via SQL RPC |
| `src/server/integrations/payments/stripe/webhook-handler.ts` | Handles all Stripe events (subscription lifecycle, credit pack purchases, trial tracking) |
| `src/hooks/use-plan.ts` | React hook — client-side plan state with `canAccess(feature)` |
| `src/components/billing/feature-gate.tsx` | UI paywall component (blur + overlay + emotional copy) |
| `src/components/billing/pricing-page.tsx` | Pricing page (weekly/monthly/yearly toggle, price anchoring, trial CTA) |
| `src/app/api/stripe/checkout/route.ts` | Creates Stripe Checkout sessions (idempotent, trial-aware) |
| `src/app/api/stripe/webhook/route.ts` | Verifies Stripe signature and delegates to `StripeWebhookHandler` |

---

### Capability-Based Feature Gating

Features are mapped to minimum plan tiers. Adding a new gated feature = one line change.

```ts
// src/hooks/use-plan.ts + src/server/foundation/modules/billing/cached-entitlement.ts
const FEATURE_CAPABILITIES = {
  'horoscope.personal':  'pro',
  'birth_chart.full':    'pro',
  'compatibility.deep':  'pro',
  'palm.scan':           'pro',
  'soulmate.generate':   'pro',
  'tarot.modes':         'pro',
}

const PLAN_TIER = { free: 0, pro: 1, premium: 2 }
// access = PLAN_TIER[userPlan] >= PLAN_TIER[FEATURE_CAPABILITIES[feature]]
```

**Frontend:** `<FeatureGate feature="palm.scan">` wraps Pro-only UI. Shows blurred preview + upgrade overlay when locked.

**Backend:** Every AI-generating API route checks `entitlementAllows(tier, feature)` server-side. Returns soft paywall response (`{ locked: true, feature, planCode, cta: 'pro_required' }`) instead of a bare 403.

---

### Entitlement Caching

The entitlement check (DB query for subscription + credits) runs on every API request. Without caching, this would add ~50ms latency to every call.

**Fix:** `unstable_cache` from `next/cache` with a per-user dynamic key:

```ts
// One cache entry per user — prevents User A seeing User B's subscription
getCachedEntitlement(userId)()  // returns { planCode, tier, creditBalance }
// TTL: 5 minutes
// Cache tag: `sub:${userId}`
// Invalidated by: revalidateTag(`sub:${userId}`, 'max') in webhook handler
```

After any subscription change (subscribe, cancel, payment fail), the webhook calls `revalidateTag` so the next request gets fresh data within milliseconds.

---

### Checkout Flow (End-to-End)

```
1. User clicks "Get Pro" on pricing page
2. Frontend POSTs to /api/stripe/checkout  { lookup_key, trial: true }
3. Route checks idempotency key — if session created <30 min ago, return same URL
4. Route resolves Stripe price ID from DB by lookup_key
5. Gets/creates Stripe customer (stored in identity.profiles.stripe_customer_id)
6. Checks has_used_trial — adds trial_period_days: 3 if eligible
7. Creates Stripe Checkout Session
8. Stores session URL in platform.idempotency_keys (30-min TTL)
9. Returns { url } → frontend redirects to Stripe-hosted checkout page

10. User completes payment on Stripe
11. Stripe fires webhook → POST /api/stripe/webhook
12. Signature verified with STRIPE_WEBHOOK_SECRET
13. StripeWebhookHandler.handle(event) called
14. For customer.subscription.created:
    - upsertSubscription() → billing.subscriptions row created/updated
    - setHasUsedTrial(userId) → marks trial as used
    - revalidateTag(`sub:${userId}`) → busts entitlement cache
15. User redirected to /settings?checkout=success
16. Next page load: getCachedEntitlement() fetches fresh Pro entitlement
```

---

### Credit Deduction Flow (Advisor Chat)

```
POST /api/dashboard/advisors/[slug]/messages
  │
  ├── Auth check
  ├── billing.deductCredit(userId)
  │     └── reads latest balance_after from credit_transactions
  │     └── if balance < 1 → return { deducted: false }  → 402 Insufficient Credits
  │     └── inserts session_charge row (balance_after = prev - 1)
  │     └── return { deducted: true, balanceAfter }
  │
  ├── chatService.sendMessage(...)
  │     ├── SUCCESS → return result + creditBalance to frontend
  │     └── FAILURE → billing.refundCredit(userId, 'ai_failure')
  │                   inserts refund row (balance_after = prev + 1)
  │                   re-throw error
  │
  └── Return { ...result, creditBalance }
```

---

### Rate Limiting

Global daily cap on AI-generating feature endpoints (not billing/auth):

| Plan | Daily limit |
|------|------------|
| Free | 20 requests |
| Pro | 200 requests |

Implemented via `platform.check_user_rate_limit(user_id, scope, limit)` SQL RPC:
- Atomically increments `platform.usage_counters` counter
- Returns `{ allowed, current_count, limit_cap }`
- Resets at UTC midnight (daily window key = `YYYY-MM-DD`)
- **Fails open** — if DB call errors, request is allowed (never block users due to infrastructure failure)

Applied to: `POST /api/astro/birth-chart`, `POST /api/palm/scan`, `POST /api/palm/interpret`

---

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Credit pack → add credit transaction |
| `customer.subscription.created` | Upsert subscription + set `has_used_trial=true` + bust cache |
| `customer.subscription.updated` | Upsert subscription + bust cache |
| `customer.subscription.deleted` | Mark subscription `canceled` + bust cache |
| `invoice.payment_succeeded` | No-op (subscription.updated handles period sync) |
| `invoice.payment_failed` | Mark subscription `past_due` (belt-and-suspenders; subscription.updated also fires) |

All events are idempotent — `platform.idempotency_keys` ensures each event ID is processed exactly once. If processing fails, the event is NOT marked complete and Stripe will retry.

---

### Security Properties

| Concern | Solution |
|---------|---------|
| Multi-user cache leak | Per-user dynamic cache key `['entitlement', userId]` — never a shared key |
| Double checkout session | Idempotency check before Stripe session creation (30-min TTL) |
| Trial abuse | `has_used_trial` flag per user, set on `subscription.created` webhook |
| Race condition on credit deduction | Append-only ledger with sequential read — concurrent requests at same ms prevented by DB serialization |
| Webhook replay attacks | Stripe signature verification + idempotency key per event ID |
| Bypassing per-endpoint rate limits | Single global counter across all feature endpoints |
| API route bypassing frontend gates | Every Pro feature has BOTH frontend gate AND backend entitlement check |
| Soft paywall vs hard 403 | Returns `{ locked: true, cta: 'pro_required' }` — frontend shows upgrade UI rather than an error |

---

### Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...          # Server-side only, never exposed to browser
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Safe to expose (used in checkout redirect)
STRIPE_WEBHOOK_SECRET=whsec_...        # Verifies webhook signatures

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=             # Server-side only, used for all billing writes
```

---

### Migrations Applied (in order)

| Migration | What it does |
|-----------|-------------|
| `20260312_01_foundation_hardening_core.sql` | Creates `billing.*`, `platform.*`, `identity.*` schemas and all base tables |
| `20260312_10_stripe_price_catalog_dynamic_pricing.sql` | Creates `billing.plan_price_versions` with partial unique index |
| `20260313_13_audit_remediation.sql` | Adds `billing_interval_count` to the unique index |
| `20260319_16_stripe_customer_id_and_plan_update.sql` | Adds `stripe_customer_id` to profiles; seeds INR plan catalog |
| `20260320_17_trial_tracking_weekly_price_rate_limit.sql` | Adds `has_used_trial`; extends interval CHECK for 'week'; inserts USD prices; creates rate limit RPC |
| `20260320_18_fix_credit_pack_uniqueness.sql` | Fixes unique index to allow multiple one-time credit pack prices; inserts missing credits_100/200 rows |
