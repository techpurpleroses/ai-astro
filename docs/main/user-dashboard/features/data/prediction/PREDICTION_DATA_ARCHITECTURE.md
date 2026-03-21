# Prediction Report — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Prediction Report feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

The Prediction Report provides a full-year cosmic forecast across Love, Career, Health, and Personal Growth themes. It lives at `/features/prediction`.

---

## Current Data Flow

```
PredictionClient (prediction-page.tsx)
  └─ No data fetch — THEMES is a module-level constant
       → Hardcoded summaries for Love/Career/Health/Growth
       → No birth chart data used
       → FeatureGate: "prediction.report"
```

---

## Intended Data Flow (Phase 2)

```
PredictionClient
  └─ usePredictionReport()
       └─ GET /api/dashboard/features/prediction
            └─ Uses user's birth chart + year transits to generate themes
                 → { themes: [{ label, summary, highlights }] }
```

---

## Component

### `PredictionClient`
`src/components/features/prediction/prediction-page.tsx`

Hardcoded `THEMES` constant:

```typescript
const THEMES = [
  { icon: Heart,      label: 'Love & Relationships', color: '#F43F5E',
    summary: 'Venus trine your natal Moon opens a powerful window for deep connection in Q3 2026.' },
  { icon: Briefcase,  label: 'Career & Finances',    color: '#06B6D4',
    summary: 'Saturn's discipline meets Jupiter's expansion — a career breakthrough is building slowly but surely.' },
  { icon: Shield,     label: 'Health & Wellbeing',   color: '#84CC16',
    summary: 'Mars in your 6th house pushes you toward structure.' },
  { icon: TrendingUp, label: 'Personal Growth',      color: '#A78BFA',
    summary: 'Your progressed Sun moves into a new sign this year.' },
]
```

All theme summaries reference "your natal Moon", "your 6th house", "your progressed Sun" but none of these are computed from the user's actual chart.

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Hero image + title | No gate — visible to all |
| Theme cards + Full Report CTA | `FeatureGate feature="prediction.report"` |

---

*This document should be updated when prediction themes are generated from the user's actual birth chart and year transits.*
