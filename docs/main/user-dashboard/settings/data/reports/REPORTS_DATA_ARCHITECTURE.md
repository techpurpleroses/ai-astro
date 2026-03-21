# Settings Reports — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Report detail pages under Settings (`/settings/reports/[slug]`).
>
> **Status as of 2026-03-21**

---

## Page Overview

Report pages under Settings render individual report detail views — either an unlocked full report or a "gift/promo" purchase teaser. Accessible from the Reports from Advisors strip on the Settings main page.

---

## Data Flow

```
/settings/reports/[slug]/page.tsx
  └─ ReportPageClient
       └─ useReportDetail(slug)
            └─ GET /api/dashboard/features/reports/:slug
                 → { product: AdvisorReportProduct, detail: ReportDetailData }
                 → Two render modes:
                      1. Unlocked: full report (title, hero image, stats, sections)
                      2. Gift/promo: blurred preview + purchase CTA
```

---

## Hook

### `useReportDetail(slug)`
`src/hooks/use-reports.ts`

```typescript
useQuery({
  queryKey: ['reports', 'detail', slug],
  queryFn: () => astroFetchJson(`/api/dashboard/features/reports/${slug}`),
  staleTime: 1000 * 60 * 60,  // 1h
  enabled: !!slug,
})
```

---

## Endpoint

### `GET /api/dashboard/features/reports/:slug`
`src/app/api/dashboard/features/reports/[slug]/route.ts`

**Auth:** None required for preview data; purchase requires auth.

**Returns:**
```json
{
  "product": {
    "id": "soulmate-sketch",
    "title": "Soulmate Sketch",
    "badge": "Gift",
    "slug": "soulmate-sketch"
  },
  "detail": {
    "id": "soulmate-sketch",
    "title": "Your Cosmic Soulmate Portrait",
    "subtitle": "...",
    "stats": [{ "label": "Pages", "value": "12" }],
    "sections": [{ "title": "...", "body": "...", "bullets": [] }]
  }
}
```

---

## Render Modes

### Mode 1 — Unlocked Report
Shown when `product.badge !== 'Gift'` (or user has purchased).

Displays:
- Hero image
- Stats grid (pages, signs, etc.)
- Section list (title + body + bullet list)

### Mode 2 — Gift/Promo Report
Shown when `product.badge === 'Gift'`.

Displays:
- Blurred preview of sections
- Discount pricing from `GIFT_PROMO` constant
- Perks list
- Purchase CTA button

---

## Hardcoded Constants

### `GIFT_PROMO`
`src/components/settings/report-page.tsx`

```typescript
const GIFT_PROMO: Record<string, { price: string; originalPrice: string; perks: string[] }> = {
  'soulmate-sketch': {
    price: '$4.99',
    originalPrice: '$9.99',
    perks: ['AI-generated portrait', 'Full birth chart synastry', 'Compatible signs analysis', 'Lucky timing windows'],
  },
  'prediction-2026-report': {
    price: '$7.99',
    originalPrice: '$14.99',
    perks: ['12-month forecast', 'Career & love predictions', 'Major transit alerts', 'Personalized PDF'],
  },
}
```

Prices are hardcoded USD strings, not sourced from `billing.plan_price_versions`.

---

## Report Icon Fallback

`ReportsFromAdvisors` component has a `REPORT_ICON_MAP` fallback for reports whose DB record has no `imageSrc`. This is a UX fallback, not a data gap.

---

## Database Tables

Report content (sections, stats) comes from the API layer (likely a static data file or DB table). Report products are listed in the features reports endpoint.

---

*`GIFT_PROMO` pricing is the key outstanding gap — should match Stripe price objects.*
