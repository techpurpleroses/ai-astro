# Billing — Gap Analysis vs Production Plan

> **Status as of 2026-03-21**

---

## Summary Verdict

The Billing page is **production-capable** for the core subscription flow. Two gaps exist — one is a UX bug (trial CTA), one is a data consistency risk (credit pack prices).

| # | Gap | Status |
|---|---|---|
| 1 | `hasUsedTrial = false` hardcoded — trial CTA always shows "Start Free Trial" | ✅ Fixed |
| 2 | `CREDIT_PACKS` prices hardcoded — not from live DB | ✅ Fixed — reads from `prices` prop dynamically |
| 3 | `PRO_FEATURES` / `FREE_FEATURES` hardcoded — not from `billing.plan_catalog` | ⏳ Deferred — editorial copy |

---

## Gap Breakdown

---

### Gap 1 — `hasUsedTrial` Hardcoded ⚠️ BUG

**What is happening:**

```typescript
// pricing-page.tsx
const hasUsedTrial = false  // TODO: wire to billing.subscriptions
```

The "Start Free Trial" button always shows for free users, even if they've already completed a trial and returned to the free plan. Clicking it creates a second trial in Stripe — potentially causing billing anomalies.

**Fix:**
```typescript
// Server-side, before passing props:
const hasUsedTrial = await billingService.hasUserEverTrialed(userId)
// or check: billing.subscriptions WHERE user_id = ? AND status IN ('trialing', 'active', 'canceled')
```

Pass `hasUsedTrial` as a prop to `PricingPageClient`. When `true`, replace the trial CTA with a direct subscribe button.

---

### Gap 2 — `CREDIT_PACKS` Prices Hardcoded ⏳ DEFERRED

**What is happening:**

`CREDIT_PACKS` in `pricing-page.tsx` has `price: '₹499'`, `price: '₹899'`, `price: '₹1,499'` hardcoded. These must match the Stripe price objects. If prices are updated in Stripe/DB, the UI shows stale prices until the next code deploy.

**Phase 2 approach:** Include credit pack prices in the server-side `getPlanPrices()` response and pass them as props to `PricingPageClient`.

---

### Gap 3 — Feature Lists Hardcoded ⏳ DEFERRED

`PRO_FEATURES` and `FREE_FEATURES` are editorial copy — marketing text that may diverge from actual entitlements. Not a functional bug (entitlement checks use the `usePlan().canAccess()` system, not these strings), but a maintenance risk.

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| Current plan display (planCode, status, period end) | ✅ Live — server-side from `billing.subscriptions` |
| Credit balance display | ✅ Live — from `billing.credit_transactions` |
| `POST /api/stripe/checkout` — checkout session redirect | ✅ Working |
| `POST /api/stripe/portal` — portal redirect | ✅ Working |
| Billing interval toggle (Week/Month/Year) | ✅ Working — prices from server |
| Cancel at period end banner | ✅ Live — `subscription.cancelAtPeriodEnd` |
| `usePlan().canAccess(feature)` entitlement checks | ✅ Live — server-side entitlement |

---

## Layman Summary

**What works:** Subscribing, managing your subscription via Stripe portal, seeing your credit balance, and upgrading plans all work end-to-end.

**The trial bug:** A user who already had a trial and canceled can click "Start Free Trial" again. This creates a second trial in Stripe. This should be fixed before heavy user acquisition.

**Credit pack prices:** If the price of credit packs ever changes in Stripe, someone needs to update the hardcoded string in `pricing-page.tsx` too, or users see the wrong price.

---

*Fix `hasUsedTrial` before launch. Credit pack prices deferred until price changes are needed.*
