# Advisors Tab — Gap Analysis vs Production Plan

> Compares the Advisors tab and Chat screen against production-readiness requirements.
> Every item is traceable to actual hook/component/service code.
>
> **Status as of 2026-03-21**

---

## Summary Verdict

The Advisors tab is **production-capable for the core chat flow**. As of 2026-03-21 all blocking gaps are resolved or confirmed already handled:

| # | Gap | Status |
|---|---|---|
| 1 | `recentChats` hardcoded to `[]` — My Chats strip never renders | ✅ Fixed |
| 2 | Credit balance not fetched on page load | ✅ Already handled via `usePlan()` |
| 3 | `is_online` stale for 5-min cache window | ✅ Fixed — staleTime lowered to 30s |
| 4 | Ask Question CTA had no handler | ✅ Already handled — `onAsk={goToFirstChat}` wired |
| 5 | Inline tarot never populated by service | ⏳ Deferred — needs `tarot_card` DB column |

The credit deduction, AI call, message persistence, and optimistic UI are all production-grade. The chat flow itself is shippable.

---

## Gap-by-Gap Breakdown

---

### Gap 1 — My Chats Strip Never Renders ✅ FIXED

**What is happening:**

`useAdvisors()` in `src/hooks/use-advisors.ts`:
```typescript
return {
  advisors: (data.advisors ?? []).map(...),
  recentChats: [],   // always empty — hardcoded
}
```

`MyChatsStrip` in `advisors-page.tsx`:
```typescript
{recentChats.length > 0 && <MyChatsStrip ... />}
```

The strip never renders for any user because `recentChats` is hardcoded to an empty array. The design and component exist but the data never flows.

**What should happen:**
**What changed:**
- `AdvisorsListDTO` now includes `recentChats: string[]`
- `AdvisorsService.listAdvisors(userId?)` runs a parallel query on `chat.chat_sessions` joined to `chat.advisors` — returns the user's 5 most recently chatted advisor slugs (deduplicated, most recent first)
- `GET /api/dashboard/advisors` route now authenticates the user (optional — unauthenticated users still get the advisor list, just with empty `recentChats`)
- `useAdvisors()` hook now reads `recentChats` from the API response

---

### Gap 2 — Credit Balance Not Fetched on Page Load ✅ ALREADY HANDLED

`chat-page.tsx` uses `usePlan()` which calls `GET /api/billing/subscription` on mount and returns `creditBalance` from `credits.balance`. The `hasCredits = creditBalance > 0` check is based on this live value — the "Buy Credits" wall appears as soon as the plan query resolves, before the user ever sends a message.

---

### Gap 3 — `is_online` Is a Static DB Field ✅ FIXED (minimal)

`useAdvisors()` staleTime lowered from 5 minutes to 30 seconds. The online status now refreshes at least every 30 seconds on window focus or re-render.

> **Remaining hardening (Phase 2):** A Supabase Realtime subscription on `chat.advisors.is_online` changes would give true real-time presence without polling. A presence heartbeat from the advisor-side app would make `is_online` accurate at the DB level.

---

### Gap 4 — Ask Question CTA Is a Dead UI Element ✅ ALREADY HANDLED

**What is happening:**

`AskQuestionCTA` renders an input field with placeholder "Ask your question..." but has no `onSubmit` / `onClick` handler:

```typescript
function AskQuestionCTA() {
  return (
    <div className="mx-4 mb-4 ...">
      <MessageSquare ... />
      <input placeholder="Ask your question..." className="..." />
    </div>
  )
}
```

Tapping or typing does nothing. It is visual-only.

`AskQuestionCTA` receives `onAsk={goToFirstChat}` which routes to the first online advisor (or first advisor overall if none online). The button is functional.

---

### Gap 5 — Inline Tarot Card in Chat Is Never Populated ⏳ DEFERRED

**What is happening:**

`ChatMessage` type has `tarotCard?: TarotCard`. `MessageBubble` renders `InlineTarotCard` when `message.tarotCard` is set:
```typescript
{message.tarotCard && <InlineTarotCard card={message.tarotCard} />}
```

But `ChatService.sendMessage()` never sets `tarotCard` on any message. `chat.chat_messages` has no `tarot_card` column either. The feature is stubbed in types and UI but disconnected from the backend.

**What should happen:**
- `ChatService.sendMessage()` can optionally include a tarot reading when the AI response references one
- Or: the AI is given a structured output schema that can return `{ content, tarotCard?: TarotCard }`
- Or: gate the tarot feature behind a specific advisor skill tag (`advisor.skills.includes('tarot')`)

**Impact:** No user-visible breakage today (the field is simply never set). But the UI component is dead code until the service populates it.

---

## Secondary Issues (Non-Blocking)

### Chat History Pagination Missing

`ChatService.getHistory()` limits messages to 100 with `.limit(100)`. Long conversations silently truncate. No "load older messages" UI. For MVP this is acceptable but needs a pagination plan before conversations get long.

### `GET /api/dashboard/advisors/[slug]` Route Is Unused

The route exists and works but `useAdvisor(id)` is a selector over the cached list — it never calls this endpoint. The route could be deleted or kept as a future server-side detail page. Not a bug.

### Session Timer Is Cosmetic

`SessionTimer` increments seconds only when `advisor.isOnline === true`. It starts from 0 on every page load — not the actual session duration from `chat_sessions.started_at`. Fine for MVP but should use the real start time for billing transparency.

### `src/data/advisors.json` Is Never Used

Unlike the Today tab where static JSON was imported at runtime as a fallback, `advisors.json` is never imported by any hook or route. It exists as a seed fixture. This is the correct pattern — no action needed.

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| Advisors list from Supabase `chat.advisors` | ✅ Live — ordered by rating, filtered `is_active` |
| Online / Offline split on advisors page | ✅ Working — refreshes every 30s |
| **My Chats strip** | ✅ Fixed — reads real `chat.chat_sessions` for user |
| **Credit balance on load** | ✅ Handled — `usePlan()` fetches on mount |
| **Ask Question CTA** | ✅ Handled — routes to first online advisor |
| Chat history fetch (GET messages) | ✅ Live — from `chat.chat_sessions` + `chat.chat_messages` |
| Send message flow | ✅ Production-grade — credit deduct → AI → persist → return |
| Credit deduction (atomic, pre-AI) | ✅ Correct — 1 credit per advisor message |
| Credit refund on AI failure | ✅ Correct — `BillingService.refundCredit` on `aiError` |
| Optimistic UI for messages | ✅ Correct — instant append + typing indicator |
| Session continuity (sessionId ref) | ✅ Correct — same session used across messages |
| Suggested questions from magic-ball | ✅ Working — `staleTime: Infinity` |
| Privacy banner | ✅ Static, always shown |
| No `src/data/advisors.json` runtime import | ✅ Correct — no static fallback needed here |

---

## Complete Change Plan

### What was FIXED (2026-03-21)

| Gap | Change Made |
|---|---|
| `recentChats: []` hardcoded | `AdvisorsListDTO` + `AdvisorsService.listAdvisors(userId?)` + route auth + `useAdvisors()` hook |
| `is_online` stale for 5 min | `useAdvisors()` staleTime lowered from 5 min → 30s |

### What was ALREADY HANDLED (no code change needed)

| Gap | Reason |
|---|---|
| Credit balance on load | `chat-page.tsx` uses `usePlan()` which fetches balance from `GET /api/billing/subscription` on mount |
| Ask Question CTA | `AskQuestionCTA` already receives `onAsk={goToFirstChat}` — routes to first online advisor |

### What is DEFERRED

| Gap | Requirement |
|---|---|
| Inline tarot card in chat | Needs `tarot_card` jsonb column on `chat.chat_messages` and structured output from `callAdvisorChat()` |

### What to ADD (future)

| Feature | Description |
|---|---|
| Real-time advisor presence | Supabase Realtime subscription on `chat.advisors.is_online` changes |
| Chat history pagination | Cursor-based pagination on `GET .../messages`; "Load older" button in UI |
| Session duration timer | Read actual `started_at` from `chat_sessions` instead of counting from page open |
| Message reactions / ratings | Post-session rating of advisor response |
| End session flow | `PATCH .../messages` or `/sessions/{id}` to mark session `ended` |

---

## Personalization Reality Check

| Feature | Before | After |
|---|---|---|
| My Chats strip | Never shows (hardcoded `[]`) | ✅ Shows user's actual recent sessions |
| Credit balance on load | N/A — already handled by `usePlan()` | ✅ Pre-fetched on mount |
| Online status freshness | Up to 5 min stale | ✅ Refreshes every 30s |
| Ask Question | Already handled — routes to first online advisor | ✅ No change needed |
| Inline tarot card | Never shown | ⏳ Deferred — needs DB column |

---

## Layman Summary

**What works:**
The Advisors tab shows real advisors from the database. Tapping an advisor opens their chat. Sending a message correctly charges 1 credit, calls the AI, saves the conversation, and shows the response. If the AI fails, the credit is refunded. This core loop is production-ready.

**What's broken or incomplete:**

1. **"My Chats" never shows** — the code to display recent chats is written, but it's fed an empty list. Every user always sees the full advisor directory with no "continue where you left off."

2. **No upfront credit check** — users with 0 credits see the chat input, type a message, and only learn they have no credits after hitting send. The credit wall should appear before they waste time composing a message.

3. **Online status can be wrong** — whether an advisor is shown as "Online Now" or "Available Later" is a database flag that doesn't update in real time. An offline advisor could show as online for up to 5 minutes.

4. **Ask Question does nothing** — the "Ask your question..." input on the main advisors page looks functional but has no action attached to it.

5. **Tarot card reading in chat** — the chat UI has a slot to show a tarot card inside a message, but the backend never sends one. The feature is half-built.

---

*This document should be updated after each gap is closed.*
