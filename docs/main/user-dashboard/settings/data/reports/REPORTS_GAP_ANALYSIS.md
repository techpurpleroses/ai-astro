# Settings Reports — Gap Analysis vs Production Plan

> **Status as of 2026-03-21**

---

## Summary Verdict

The Settings report pages are **production-capable** for the read flow. One gap exists in gift report pricing.

| # | Gap | Status |
|---|---|---|
| 1 | `GIFT_PROMO` prices hardcoded (USD) — not from Stripe/DB | ⏳ Deferred — intentional USD pricing |

---

## Gap Breakdown

---

### Gap 1 — `GIFT_PROMO` Prices Hardcoded ⏳ DEFERRED

**What is happening:**

Gift report purchase prices (`$4.99`, `$7.99`) and original prices (`$9.99`, `$14.99`) are hardcoded USD strings in `report-page.tsx`. The app bills in INR via Stripe (stored in `billing.plan_price_versions`).

Two sub-problems:
1. **Currency mismatch** — the rest of the app shows ₹ (INR), but GIFT_PROMO shows `$` (USD)
2. **Sync risk** — if promo pricing changes in Stripe, the display price must be updated with a code deploy

**Phase 2 approach:**
- Add gift report price IDs to `billing.plan_price_versions` with `lookup_key: 'report_soulmate_sketch_inr'`
- Include resolved prices in `GET /api/dashboard/features/reports/:slug` response
- `ReportPageClient` reads `product.promoPrice` instead of `GIFT_PROMO[slug].price`

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| `useReportDetail(slug)` → `GET /api/dashboard/features/reports/:slug` | ✅ Live |
| Unlocked report view (stats, sections, bullets) | ✅ Working |
| Gift/promo report view (blurred preview + CTA) | ✅ Rendering |
| `staleTime: 1h` on report detail | ✅ Correct |
| Report icon fallback map | ✅ Good UX fallback |

---

## Layman Summary

**What works:** Tapping a report from the Settings strip opens the detail page. Unlocked reports show their full content. Gift reports show a teaser and a purchase button.

**The currency gap:** The gift report purchase prices show `$4.99` and `$7.99` in USD, but the rest of the app shows prices in ₹ (INR). This should be corrected to show INR prices before launch.

---

*Fix currency before launch. Wire prices to Stripe lookup keys in Phase 2.*
