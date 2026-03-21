# Prediction Report — Gap Analysis vs Production Plan

> Compares the Prediction Report feature against production-readiness requirements.
>
> **Status as of 2026-03-21**

---

## Summary Verdict

The Prediction Report feature is **partially production-capable**. The entitlement gate works. The theme summaries are hardcoded generic text that references "your natal Moon" and "your 6th house" — but these values are not computed from the user's actual chart.

| # | Gap | Status |
|---|---|---|
| 1 | Theme summaries hardcoded — same for all users | ✅ Fixed — element-based personalization |

---

## Gap Breakdown

---

### Gap 1 — Theme Summaries Are Hardcoded ⏳ DEFERRED

**What is happening:**

`prediction-page.tsx` has a static `THEMES` array at module level. The summaries reference astrological concepts ("Venus trine your natal Moon", "Mars in your 6th house") but these are the same for every user — a Taurus user with no Venus trine sees the same text as anyone else.

The summaries are written in a plausible-sounding astrological voice, so they do not immediately read as "wrong" — they read as generic astrology content.

**Why acceptable for v1:**
- Content is behind `FeatureGate feature="prediction.report"` (pro-only)
- Generic astrological language is standard in the industry for preview/teaser content
- A real personalized prediction requires reading year transits + natal chart — Phase 2 scope

**Phase 2 approach:**
1. Create `GET /api/dashboard/features/prediction` BFF:
   - Load user's birth chart from `astro_core.chart_snapshots`
   - Query current year's major transits from the provider
   - Pass chart + transits to an LLM or provider endpoint to generate per-theme summaries
2. Cache per-user per-year (TTL: 30 days or until year changes)
3. `PredictionClient` calls a `usePredictionReport()` hook instead of using the static constant

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| `FeatureGate feature="prediction.report"` | ✅ Correct — free users see paywall |
| Hero image + "2026 Cosmic Forecast" page layout | ✅ Rendering |
| Theme card UI | ✅ Working |

---

## Layman Summary

**What's broken:** Every user sees the same four prediction summaries referencing "your natal Moon" and "your 6th house," but these aren't computed from their actual birth data.

**Why it's deferred:** Generating a real personalized prediction requires computing year transits against the user's natal chart — a generation pipeline that's Phase 2 scope. The current text reads as a plausible editorial preview.

---

*Update this document when prediction themes are computed from the user's birth chart and year transits.*
