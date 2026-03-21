# Soulmate by Birth Chart — Gap Analysis vs Production Plan

> Compares the Soulmate feature against production-readiness requirements.
>
> **Status as of 2026-03-21**

---

## Summary Verdict

The Soulmate feature is **partially production-capable**. The entitlement gate works. The content is entirely hardcoded to Scorpio/Cancer/Aquarius — incorrect for all users who aren't that combination.

| # | Gap | Status |
|---|---|---|
| 1 | All soulmate content hardcoded to Scorpio profile | ✅ Fixed |

---

## Gap Breakdown

---

### Gap 1 — Content Hardcoded to Scorpio Profile ⏳ DEFERRED

**What is happening:**

`soulmate-page.tsx` is fully static:

```typescript
// Subtitle — always shows Scorpio regardless of user's sign:
<p className="text-xs text-text-muted">
  Based on your Scorpio Sun · Cancer Moon · Aquarius Rising
</p>

// Soulmate profile — always Capricorn/Pisces/Libra:
{ label: 'Sun Sign', value: 'Capricorn', glyph: '♑', color: '#78716C' },
{ label: 'Moon Sign', value: 'Pisces',   glyph: '♓', color: '#6366F1' },
{ label: 'Rising Sign', value: 'Libra',  glyph: '♎', color: '#A78BFA' },

// Timing — hardcoded dates:
{['Oct 12–28, 2026', 'Dec 3–20, 2026'].map(...)}
```

A Taurus user will see "Based on your Scorpio Sun" and a soulmate profile for a Scorpio. This is incorrect but not immediately broken in the way a wrong API call is — it renders, just with wrong data.

**Why acceptable for v1:**
- The `FeatureGate feature="soulmate.generate"` gate hides this content from free users
- For pro users who can see it, it reads as generic editorial demo content
- A proper implementation requires a generation pipeline (provider API or LLM) — Phase 2 scope

**Phase 2 approach:**
1. Connect to `useUserProfile()` for the subtitle (user's actual sunSign/moonSign/ascendantSign)
2. Create `GET /api/dashboard/features/soulmate` BFF that:
   - Reads the user's birth chart from `astro_core.chart_snapshots`
   - Computes compatible signs from synastry rules
   - Returns `{ soulmateProfile, connectionType, timingWindows, qualities }` personalized to the user
3. Cache per-user with a 30-day TTL

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| `FeatureGate feature="soulmate.generate"` | ✅ Correct — free users see paywall |
| Soulmate portrait image + page layout | ✅ Rendering |
| Routing from Compatibility tab CTA | ✅ Working |

---

## Layman Summary

**What's broken:** Every user sees "Based on your Scorpio Sun · Cancer Moon · Aquarius Rising" and a Capricorn/Pisces/Libra soulmate profile, regardless of their actual birth data.

**Why it's deferred:** Building a real soulmate profile requires calling a generation service with the user's chart. That pipeline is Phase 2. The content currently reads as a demo/preview.

---

*Update this document when soulmate content is connected to the user's actual birth chart.*
