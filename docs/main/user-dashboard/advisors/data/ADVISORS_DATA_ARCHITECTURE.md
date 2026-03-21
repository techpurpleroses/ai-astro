# Advisors Tab — Data Architecture

> Covers every UI element visible on the Advisors tab and Chat screen, exactly what data feeds it, where that data comes from, and whether it is personalized or generic.
>
> **Last updated: 2026-03-21**

---

## Page Layout Overview

```
Advisors Tab  (/advisors)
│
├── [HEADER]            sticky — "Advisors" centred, settings left, heart+count right
├── [MY CHATS STRIP]    horizontal scrollable — recent advisor avatars  (hidden when empty)
├── [ASK QUESTION CTA]  "Ask your question..." input bar
├── [ONLINE NOW]        vertical list of online advisors
└── [AVAILABLE LATER]   vertical list of offline advisors

Chat Screen  (/advisors/[id])
│
├── [HEADER]            advisor avatar, name, specialty, rating, online badge, session timer
├── [PRIVACY BANNER]    "All sessions are private and confidential"
├── [CHAT AREA]         scrollable message thread
│   ├── Suggested questions (shown when chat is empty)
│   ├── Message bubbles (user right / advisor left)
│   └── Typing indicator (animated dots)
└── [INPUT BAR]         textarea + send button  OR  "Buy Credits" CTA
```

---

## Data Request Architecture

```
Advisors Tab
  ├── useAdvisors()          →  GET /api/dashboard/advisors
  └── useSuggestedQuestions() →  GET /api/dashboard/features/magic-ball

Chat Screen
  ├── useAdvisors()          →  ['advisors'] cache (shared, no new request)
  ├── useChatMessages(slug)  →  GET /api/dashboard/advisors/{slug}/messages
  └── Send message           →  POST /api/dashboard/advisors/{slug}/messages
```

---

## Hooks

| Hook | Endpoint | Cache Key | staleTime |
|---|---|---|---|
| `useAdvisors()` | `GET /api/dashboard/advisors` | `['advisors']` | 5 min |
| `useAdvisor(id)` | Selector over `useAdvisors()` — no extra request | `['advisors']` | 5 min |
| `useChatMessages(slug)` | `GET /api/dashboard/advisors/{slug}/messages` | `['chat', slug]` | 0 (always fresh) |
| `useSuggestedQuestions()` | `GET /api/dashboard/features/magic-ball` | `['suggested-questions']` | Infinity |

---

## Section 1: Advisors Tab Header

**File:** `src/components/advisors/advisors-page.tsx`

| UI Element | Data | Source |
|---|---|---|
| "Advisors" label | Static | — |
| Settings icon | Navigation to `/settings` | — |
| Heart icon + count | Static "842" (hardcoded) | Static |

> The heart/count badge is hardcoded. No API call backs it.

---

## Section 2: My Chats Strip

**File:** `src/components/advisors/advisors-page.tsx` → `MyChatsStrip`

Only rendered when `recentChats.length > 0`.

| UI Element | Data | Source |
|---|---|---|
| Circular advisor avatar | `advisor.avatar` → image URL | `useAdvisors()` → `advisors` list filtered by `recentChats[]` |
| "My Chats" label | Static | — |

**Current state:** `recentChats` is **hardcoded to `[]`** in the `useAdvisors` hook — the strip never renders.

```typescript
// use-advisors.ts — recentChats is always empty
return {
  advisors: (data.advisors ?? []).map(...),
  recentChats: [],   // ← never populated
}
```

> **Gap:** Recent chats need to come from `chat.chat_sessions` (user's active/historical sessions). See gap analysis.

---

## Section 3: Ask Question CTA

**File:** `src/components/advisors/advisors-page.tsx` → `AskQuestionCTA`

| UI Element | Data | Source |
|---|---|---|
| "Ask your question..." placeholder | Static | — |
| Input field | Local state | — |
| Message icon | Static UI | — |

> Currently non-functional — tapping the input does nothing (no `onSubmit` handler). Navigation intent only.

---

## Section 4: Advisor Cards (Online Now + Available Later)

**File:** `src/components/advisors/advisors-page.tsx` → `AdvisorCard`

Data source: `useAdvisors()` → `GET /api/dashboard/advisors` → `chat.advisors` table (ordered by rating desc, filtered `is_active = true`)

| UI Element | Data Field | Type |
|---|---|---|
| Avatar | `advisor.avatar` (= `avatarUrl` from DB) | URL or gradient fallback |
| Name | `advisor.name` | `chat.advisors.name` |
| Specialty | `advisor.specialty` | `chat.advisors.specialty` |
| Specialty icon | `advisor.specialtyIcon` | `chat.advisors.specialty_icon` |
| Rating (gold stars) | `advisor.rating` | `chat.advisors.rating` (float) |
| Review count | `advisor.reviewCount` | `chat.advisors.review_count` |
| Response time | `advisor.responseTime` | `chat.advisors.response_time` |
| Rate / min | `advisor.ratePerMinute` | `chat.advisors.rate_per_minute` (₹) |
| Online indicator (green dot) | `advisor.isOnline` | `chat.advisors.is_online` (bool) |
| "Chat Now" button (cyan) | `advisor.isOnline === true` | — |
| "Leave Message" button (muted) | `advisor.isOnline === false` | — |
| Navigation on tap | Routes to `/advisors/{advisor.id}` | `advisor.id` = `chat.advisors.slug` |

**Sections rendered:**
- **Online Now** — `advisors.filter(a => a.isOnline)`
- **Available Later** — `advisors.filter(a => !a.isOnline)`

---

## Section 5: Chat Screen Header

**File:** `src/components/advisors/chat/chat-page.tsx`

Data source: `useAdvisor(advisorId)` — selector over cached `useAdvisors()` result, no extra request.

| UI Element | Data Field | Source |
|---|---|---|
| Advisor avatar | `advisor.avatar` | `chat.advisors.avatar_url` |
| Advisor name | `advisor.name` | `chat.advisors.name` |
| Specialty | `advisor.specialty` | `chat.advisors.specialty` |
| Rating | `advisor.rating` | `chat.advisors.rating` |
| "Online" badge | `advisor.isOnline` | `chat.advisors.is_online` |
| Session timer | Increments every second when `advisor.isOnline` | Local `useState` + `setInterval` |
| Back button | Navigation to `/advisors` | — |

---

## Section 6: Chat Area

**File:** `src/components/advisors/chat/chat-page.tsx`

Data source: `useChatMessages(advisorSlug)` → `GET /api/dashboard/advisors/{slug}/messages`

### Suggested Questions (shown when messages list is empty)

| UI Element | Data | Source |
|---|---|---|
| Question text (max 3) | `suggestedQuestions[0..2]` | `useSuggestedQuestions()` → `magic-ball` endpoint |
| Tap to pre-fill | Sets input textarea value | Local state |

### Message Bubbles

| UI Element | Data Field | Source |
|---|---|---|
| User message (right, cyan) | `message.content` | `chat.chat_messages.content` where `role = 'user'` |
| Advisor message (left, dark) | `message.content` | `chat.chat_messages.content` where `role = 'advisor'` |
| Advisor initials avatar | Derived from `advisor.name` | Computed inline |
| Timestamp | `message.timestamp` formatted `h:mm a` | `chat.chat_messages.created_at` |
| Inline tarot card | `message.tarotCard` | `chat.chat_messages` — field exists in type but never populated by service |

### Typing Indicator

Shown while waiting for advisor response (between optimistic user message and server response). Pure local state — not a real-time DB subscription.

---

## Section 7: Input Bar / Credits

**File:** `src/components/advisors/chat/chat-page.tsx`

| Condition | UI Shown | Data |
|---|---|---|
| `creditBalance > 0` | Textarea + send button | `creditBalance` from last POST response |
| `creditBalance === 0` | "Buy Credits to Continue" button → `/billing` | `creditBalance` from last POST response |

> The initial credit balance is **not fetched on page load**. It is only updated after a successful or failed message send. The "Buy Credits" wall appears after the first 402 response, not proactively.

---

## Send Message Flow

**Endpoint:** `POST /api/dashboard/advisors/{slug}/messages`

**Request:**
```typescript
{ content: string (1–2000 chars); sessionId?: string (UUID) }
```

**Server flow:**
1. Authenticate user (`getServerSupabaseClient()`)
2. Validate body with Zod schema
3. **Atomically deduct 1 credit** (`BillingService.deductCredit(userId)`)
   - Returns `{ deducted: false }` → 402 `insufficient_credits`
4. Look up advisor in `chat.advisors` (needs `is_active = true`)
5. Create `chat.chat_sessions` row if no `sessionId` provided
6. Insert user message into `chat.chat_messages`
7. Build system prompt from `chat.advisors.system_prompt` (fallback: generic prompt)
8. Call `callAdvisorChat()` → OpenAI API
   - **On AI failure:** refund credit via `BillingService.refundCredit(userId, 'ai_failure')`
9. Insert advisor response into `chat.chat_messages` with `model` and `token_usage`
10. Return `{ session, userMessage, advisorMessage, creditBalance }`

**Response:**
```typescript
{
  session: { id: string; status: 'active'; startedAt: string; advisorSlug: string }
  userMessage: ChatMessageDTO
  advisorMessage: ChatMessageDTO
  creditBalance: number
}
```

**Client handling (optimistic UI):**
1. Append user message to UI immediately (before POST returns)
2. Show typing indicator
3. On success: replace optimistic message with server message; append advisor reply
4. Store `sessionId` in ref for next message
5. Update `creditBalance` state from response

---

## Database Tables

All tables live in the `chat` schema.

### `chat.advisors`

| Column | Type | Description |
|---|---|---|
| `slug` | text PK | Used as `advisor.id` in all frontend references |
| `name` | text | Display name |
| `specialty` | text | Primary specialty label |
| `specialty_icon` | text | Icon identifier |
| `tagline` | text | Short tagline |
| `bio` | text | Long bio |
| `zodiac_sign` | text | Advisor's zodiac sign |
| `years_of_experience` | int | Years in practice |
| `skills` | jsonb | `string[]` skill tags |
| `languages` | jsonb | `string[]` language codes |
| `rate_per_minute` | numeric | Rate in ₹ |
| `rating` | numeric | Aggregate rating (0–5) |
| `review_count` | int | Total reviews |
| `is_online` | bool | Current online status (static field, not real-time) |
| `response_time` | text | e.g. "Responds in ~2 min" |
| `total_sessions` | int | Lifetime session count |
| `avatar_url` | text | Avatar image URL |
| `system_prompt` | text | OpenAI system prompt for this advisor persona |
| `is_active` | bool | Hidden from list if false |

### `chat.chat_sessions`

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Session ID passed back to client as `sessionId` |
| `user_id` | uuid | FK → auth user |
| `advisor_id` | uuid | FK → `chat.advisors` |
| `status` | text | `'active' \| 'ended' \| 'pending'` |
| `started_at` | timestamptz | Session start |

### `chat.chat_messages`

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Message ID |
| `session_id` | uuid | FK → `chat.chat_sessions` |
| `user_id` | uuid | FK → auth user |
| `advisor_id` | uuid | FK → `chat.advisors` |
| `role` | text | `'user' \| 'advisor'` |
| `content` | text | Message text |
| `model` | text | OpenAI model used (advisor messages only) |
| `token_usage` | jsonb | `{ promptTokens, completionTokens, totalTokens }` |
| `created_at` | timestamptz | Message timestamp |

---

## API Endpoints

### `GET /api/dashboard/advisors`

**File:** `src/app/api/dashboard/advisors/route.ts`
**Service:** `AdvisorsService.listAdvisors()`

Returns all active advisors ordered by rating desc.

```json
{ "advisors": [ AdvisorDTO ] }
```

---

### `GET /api/dashboard/advisors/[slug]`

**File:** `src/app/api/dashboard/advisors/[slug]/route.ts`
**Service:** `AdvisorsService.getAdvisor(slug)`

Returns a single advisor. Not currently called by any hook — `useAdvisor(id)` filters the cached list instead.

```json
{ "advisor": AdvisorDTO }
```

---

### `GET /api/dashboard/advisors/[slug]/messages`

**File:** `src/app/api/dashboard/advisors/[slug]/messages/route.ts`
**Service:** `ChatService.getHistory(userId, slug)`

Returns the most recent active session + its messages (max 100, ordered ASC).

```json
{
  "session": { "id": "uuid", "status": "active", "startedAt": "ISO", "advisorSlug": "luna-rose" } | null,
  "messages": [ ChatMessageDTO ]
}
```

---

### `POST /api/dashboard/advisors/[slug]/messages`

**File:** `src/app/api/dashboard/advisors/[slug]/messages/route.ts`
**Service:** `ChatService.sendMessage(input)`

Deducts 1 credit, calls OpenAI, persists both messages, returns them.

```json
{
  "session": ChatSessionDTO,
  "userMessage": ChatMessageDTO,
  "advisorMessage": ChatMessageDTO,
  "creditBalance": 12
}
```

**Error responses:**
- `402 { error: "insufficient_credits", creditBalance: 0 }` — no credits
- `400 { error: "invalid_request", details: ZodFlattenedError }` — validation
- `404 { error: "NOT_FOUND" }` — advisor slug not found or inactive
- `500 { error: "server_error" }` — DB or AI failure

---

## Data Flow Summary

```
Advisors List
  └── useAdvisors() → GET /api/dashboard/advisors
        └── chat.advisors (ordered by rating, is_active = true)
              → Splits into Online Now / Available Later by is_online field
              → My Chats strip: recentChats hardcoded [] → strip never shows


Chat History (on chat screen open)
  └── useChatMessages(slug) → GET /api/dashboard/advisors/{slug}/messages
        └── chat.chat_sessions (most recent active session for user + advisor)
              └── chat.chat_messages (up to 100, ASC order)


Chat Send
  └── POST /api/dashboard/advisors/{slug}/messages
        ├── BillingService.deductCredit(userId)      → platform.credit_ledger
        ├── ChatService.sendMessage(input)
        │     ├── chat.chat_sessions (create if no sessionId)
        │     ├── chat.chat_messages (insert user message)
        │     ├── callAdvisorChat() → OpenAI API
        │     └── chat.chat_messages (insert advisor response)
        └── Returns: session + userMessage + advisorMessage + creditBalance


Suggested Questions
  └── useSuggestedQuestions() → GET /api/dashboard/features/magic-ball
        → suggestedQuestions[] → first 3 shown when chat is empty
```

---

## Personalized vs Generic — Quick Reference

| UI Component | Personalized? | Requires |
|---|---|---|
| Advisor list order | No (global rating sort) | — |
| Online / Offline status | No (same `is_online` DB value for all users) | — |
| My Chats strip | Yes — user's own sessions | Auth user ID (currently broken) |
| Chat history | Yes — user's messages only | Auth user ID |
| Advisor response | Yes — AI with advisor persona | User message content + advisor system prompt |
| Credit balance | Yes — user's own balance | Auth user ID |
| Session timer | No — simple counter from page open | — |
| Suggested questions | No — same for all users | — (magic-ball, staleTime Infinity) |

---

*This document should be updated when advisor features change.*
