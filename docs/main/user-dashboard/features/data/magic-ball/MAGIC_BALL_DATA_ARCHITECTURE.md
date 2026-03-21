# Magic Ball — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Magic Ball feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

The Magic Ball is an 8-ball-style question answering feature. Users ask a question and receive a mystical response. It lives at `/features/magic-ball`.

---

## Data Flow

```
useMagicBallData()
  └─ GET /api/dashboard/features/magic-ball
       → MagicBallData { responses: string[], categories: ... }
       → MagicBallPageClient (question input + reveal animation)
```

---

## Hook

### `useMagicBallData()`
`src/hooks/use-tarot.ts`

```typescript
export function useMagicBallData() {
  return useQuery<MagicBallData>({
    queryKey: ['magic-ball'],
    queryFn: async () => {
      return astroFetchJson<MagicBallData>('/api/dashboard/features/magic-ball', {
        debugOrigin: 'hooks.use-tarot.magic-ball',
      })
    },
    staleTime: Infinity,
  })
}
```

- `staleTime: Infinity` — response pool is static editorial content
- No auth required

---

## Endpoint

### `GET /api/dashboard/features/magic-ball`
`src/app/api/dashboard/features/magic-ball/route.ts`

**Auth:** None required.

**Returns:** `MagicBallData` — pool of mystical responses served server-side.

**Content source:** Server-side data file (curated responses).

---

## Component

### `MagicBallPageClient`
`src/components/features/magic-ball/`

- Loads response pool via `useMagicBallData()`
- User types a question, shakes the ball
- Random response revealed from the pool
- No personalization — same response pool for all users

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Magic Ball | No gate — free feature |

---

*No dynamic data — response pool is genuinely static editorial content.*
