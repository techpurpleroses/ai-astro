# Settings — Main Page Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Settings landing page (`/settings`).
>
> **Status as of 2026-03-21**

---

## Page Overview

The Settings landing page shows the current user's plan badge, credit balance, quick nav rows (Profile, Language, Privacy, Help), a Reports from Advisors strip, and a logout button.

---

## Data Flow

```
/settings/page.tsx (server component)
  ├─ BillingService.getActiveSubscription(userId)
  │    └─ billing.subscriptions → planCode, creditBalance, activeUser.email
  └─ → SettingsClient (client component)
       ├─ PLAN_BENEFITS (hardcoded)
       ├─ ReportsFromAdvisors
       │    └─ useReportProducts() → GET /api/dashboard/features/reports
       └─ logout → POST /api/auth/logout
```

---

## Server-Side Data (loaded before render)

The route component (`/settings/page.tsx`) fetches:

| Data | Source |
|---|---|
| `activeUser.email` | Supabase `auth.users` |
| `activePlanCode` | `billing.subscriptions.plan_code` |
| `creditBalance` | `billing.credit_transactions` (balance_after of last tx) |

These are passed as props to `SettingsClient` — no loading states on first render.

---

## Client-Side Data

### `useReportProducts()`
`src/hooks/use-reports.ts`

```typescript
useQuery({
  queryKey: ['reports', 'products'],
  queryFn: () => astroFetchJson('/api/dashboard/features/reports'),
  staleTime: 1000 * 60 * 60,  // 1h
})
```

Used by `ReportsFromAdvisors` component to render the report strip at the bottom of the page.

---

## Hardcoded Constants

### `PLAN_BENEFITS`
`src/components/settings/settings-page.tsx`

```typescript
const PLAN_BENEFITS: Record<string, string[]> = {
  free:    ['Daily horoscope', 'Basic birth chart', 'Compatibility overview'],
  pro:     ['Personalized daily reading', 'Full birth chart', 'Deep compatibility report', 'Advisor chat (20 credits/mo)'],
  premium: ['Everything in Pro', 'Priority advisor access', 'Unlimited readings', '50 credits/mo'],
}
```

These are static strings, not sourced from `billing.plan_catalog`.

### `PLAN_ICONS` / `PLAN_LABELS`
Static display maps for badge rendering per plan code.

---

## Entitlement Gating

No content on this page is gated — all users see the full settings navigation.

---

## Database Tables

| Table | Usage |
|---|---|
| `auth.users` | Email display |
| `billing.subscriptions` | Plan code + status |
| `billing.credit_transactions` | Credit balance |
| `billing.plan_catalog` | Not used client-side (only server-side for plan lookup) |

---

*PLAN_BENEFITS should be fetched from `billing.plan_catalog.metadata` in Phase 2.*
