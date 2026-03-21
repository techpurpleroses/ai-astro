# Reports — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Reports feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

Reports are premium astrological PDF-style reports available for purchase (e.g., Birth Chart Report, Relationship Report, Year Ahead). They live at `/features/reports` and `/features/reports/[slug]`.

---

## Data Flows

```
Flow A — Product list:
  useReportProducts()
    └─ GET /api/dashboard/features/reports
         → { products: AdvisorReportProduct[] }
         → ReportsPageClient (product grid with pricing)

Flow B — Report detail:
  useReportDetail(slug)
    └─ GET /api/dashboard/features/reports/:slug
         → { product: AdvisorReportProduct, detail: ReportDetailData }
         → ReportDetailPageClient (section renderer + purchase CTA)
```

---

## Hooks

### `useReportProducts()`
`src/hooks/use-reports.ts`

```typescript
export function useReportProducts() {
  return useQuery({
    queryKey: ['reports', 'products'],
    queryFn: fetchReportProducts,
    staleTime: 1000 * 60 * 60,  // 1h
  })
}
```

### `useReportDetail(slug)`
`src/hooks/use-reports.ts`

```typescript
export function useReportDetail(slug: string) {
  return useQuery({
    queryKey: ['reports', 'detail', slug],
    queryFn: () => fetchReportDetail(slug),
    staleTime: 1000 * 60 * 60,  // 1h
    enabled: !!slug,
  })
}
```

---

## Endpoints

### `GET /api/dashboard/features/reports`
`src/app/api/dashboard/features/reports/route.ts`

**Auth:** None required — product catalog is public.

**Returns:**
```json
{
  "products": [
    {
      "id": "birth-chart-report",
      "title": "Birth Chart Report",
      "subtitle": "...",
      "price": 29900,
      "currency": "INR",
      "imageSrc": "/assets/reports/birth-chart.webp",
      "slug": "birth-chart-report"
    }
  ]
}
```

### `GET /api/dashboard/features/reports/:slug`
`src/app/api/dashboard/features/reports/[slug]/route.ts`

**Auth:** None required for preview; purchase flow requires auth.

**Returns:**
```json
{
  "product": { ... },
  "detail": {
    "id": "birth-chart-report",
    "title": "...",
    "subtitle": "...",
    "stats": [{ "label": "Pages", "value": "40+" }],
    "sections": [{ "title": "...", "body": "...", "bullets": [] }]
  }
}
```

---

## Types

```typescript
// src/hooks/use-reports.ts
export interface ReportDetailSection {
  title: string
  body: string
  bullets: string[]
}

export interface ReportDetailData {
  id: string
  title: string
  subtitle: string
  stats: Array<{ label: string; value: string }>
  sections: ReportDetailSection[]
}
```

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Browsing report catalog | No gate — public |
| Viewing report detail preview | No gate — public |
| Purchasing / downloading report | Auth + payment flow (Stripe) |

---

*Report content is editorial. No personalization in v1 — reports are fixed templates.*
