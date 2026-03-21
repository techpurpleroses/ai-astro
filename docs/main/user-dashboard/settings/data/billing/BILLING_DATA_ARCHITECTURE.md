# Billing — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Billing/Pricing page (`/settings/billing`).
>
> **Status as of 2026-03-21**

---

## Page Overview

The Billing page shows the user's current subscription, a billing interval toggle (Week/Month/Year), plan cards (Pro + Free), advisor credit packs, and Stripe checkout/portal CTAs.

---

## Data Flow

```
/settings/billing/page.tsx (server component)
  ├─ BillingService.getActiveSubscription(userId)
  │    └─ billing.subscriptions → subscription, planCode, creditBalance
  ├─ BillingService.getPlanPrices()
  │    └─ billing.plan_price_versions → prices per interval/currency
  └─ → PricingPageClient (client component)
       ├─ PRO_FEATURES (hardcoded)
       ├─ FREE_FEATURES (hardcoded)
       ├─ CREDIT_PACKS (hardcoded)
       └─ Stripe actions:
            ├─ POST /api/stripe/checkout  → Stripe checkout session
            └─ POST /api/stripe/portal    → Stripe customer portal
```

---

## Server-Side Data

Loaded in the route before rendering:

| Data | Source |
|---|---|
| Current subscription (planCode, status, period end, cancel flag) | `billing.subscriptions` |
| Credit balance | `billing.credit_transactions.balance_after` |
| Plan prices (amount_minor, billing_interval, stripe_price_id) | `billing.plan_price_versions` |
| Trial status | `billing.subscriptions.status = 'trialing'` |

---

## Stripe Endpoints

### `POST /api/stripe/checkout`
**Auth:** Required.

**Request:** `{ priceId: string, successUrl: string, cancelUrl: string }`

**Returns:** `{ url: string }` — Stripe hosted checkout URL. Client redirects.

**Used for:** New subscriptions, credit pack purchases.

### `POST /api/stripe/portal`
**Auth:** Required.

**Returns:** `{ url: string }` — Stripe customer portal URL. Client redirects.

**Used for:** Managing existing subscription (cancel, change interval, update payment method).

---

## Hardcoded Constants

### `PRO_FEATURES` / `FREE_FEATURES`
`src/components/billing/pricing-page.tsx`

Feature lists shown on plan cards. Static strings — not sourced from DB.

```typescript
const PRO_FEATURES = [
  'Full personalized horoscope',
  'Complete birth chart analysis',
  'Deep compatibility reports',
  'Advisor chat (20 credits/month)',
  'All premium features',
]
```

### `CREDIT_PACKS`
Static credit pack definitions:
```typescript
const CREDIT_PACKS = [
  { credits: 50,  label: '50 Credits',  price: '₹499',  priceId: '...' },
  { credits: 100, label: '100 Credits', price: '₹899',  priceId: '...' },
  { credits: 200, label: '200 Credits', price: '₹1,499',priceId: '...' },
]
```

Prices here must match `billing.plan_price_versions` (lookup keys: `credits_50_inr`, `credits_100_inr`, `credits_200_inr`).

### `hasUsedTrial`
```typescript
const hasUsedTrial = false  // TODO: wire to billing.subscriptions.metadata
```

Hardcoded `false` — trial CTA always shows "Start Free Trial" regardless of whether the user has already used one.

---

## `usePlan()` Hook

`src/hooks/use-plan.ts`

```typescript
useQuery({
  queryKey: ['subscription'],
  queryFn: () => astroFetchJson('/api/billing/subscription'),
  staleTime: 5 * 60 * 1000,
})
```

Used throughout the app for entitlement checks. Returns:
- `planCode: 'free' | 'pro' | 'premium'`
- `tier: number`
- `isPro: boolean`
- `creditBalance: number`
- `subscription: { status, currentPeriodEnd, cancelAtPeriodEnd }`
- `canAccess(feature: string): boolean`

---

## Database Tables

| Table | Schema | Usage |
|---|---|---|
| `subscriptions` | `billing` | Plan code, status, period, cancel flag |
| `plan_catalog` | `billing` | Plan metadata (not directly exposed to client) |
| `plan_price_versions` | `billing` | Stripe price IDs per interval/currency |
| `credit_transactions` | `billing` | Credit balance (balance_after of last tx) |
| `payments` | `billing` | Payment history (not shown on this page) |

---

## Billing Interval / Pricing

Available intervals: `week`, `month`, `year`.

Prices in INR (paise stored, displayed in rupees):
- Pro Monthly: ₹799/mo
- Pro Yearly: ₹7,188/yr
- Pro Weekly: Available

Price data comes from `billing.plan_price_versions` (server-side). The pricing page passes resolved prices as props.

---

*CREDIT_PACKS pricing and `hasUsedTrial` are the two outstanding gaps.*
