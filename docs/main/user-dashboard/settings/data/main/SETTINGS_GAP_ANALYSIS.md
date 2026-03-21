# Settings — Main Page Gap Analysis vs Production Plan

> **Status as of 2026-03-21**

---

## Summary Verdict

The Settings main page is **production-capable**. Plan code, credit balance, and reports strip are all live. Two secondary gaps exist.

| # | Gap | Status |
|---|---|---|
| 1 | `PLAN_BENEFITS` hardcoded — not from `billing.plan_catalog` | ⏳ Deferred — editorial copy, acceptable for v1 |
| 2 | Language, Privacy Policy, Terms, Help Center buttons are non-functional | ⏳ Deferred — placeholder nav |

---

## Gap Breakdown

### Gap 1 — `PLAN_BENEFITS` Hardcoded ⏳ DEFERRED

The benefits shown under each plan badge are static strings in `settings-page.tsx`. If plan features change in the DB (`billing.plan_catalog.metadata`), the settings page won't reflect them without a code deploy.

**Phase 2:** Fetch from `GET /api/billing/plans` and include `features[]` per plan in the response.

---

### Gap 2 — Non-Functional Nav Buttons ⏳ DEFERRED

"Language", "Privacy Policy", "Terms of Service", and "Help Center" buttons render with `ChevronRight` but have no `onClick` or `href`. They are placeholder UI.

**Phase 2:** Wire to static pages or external links as needed.

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| Plan badge (Free/Pro/Premium) | ✅ Live — from `billing.subscriptions` |
| Credit balance | ✅ Live — from `billing.credit_transactions` |
| Reports from Advisors strip | ✅ Live — `useReportProducts()` |
| Logout | ✅ Working — `POST /api/auth/logout` |
| Email display | ✅ Live — from `auth.users` |

---

*No blocking gaps. Update when plan benefits are sourced from DB.*
