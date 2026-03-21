# Tarot Reading — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Tarot Reading feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

The Tarot Reading feature lets users draw cards from a 78-card deck and receive a reading. It lives at `/features/tarot`.

---

## Data Flow

```
useTarotDeck()
  └─ GET /api/dashboard/features/tarot
       → { cards: TarotCard[] }
       → TarotReadingPageClient (card carousel + flip animation)
```

---

## Hook

### `useTarotDeck()`
`src/hooks/use-tarot.ts`

```typescript
export function useTarotDeck() {
  return useQuery<TarotCard[]>({
    queryKey: ['tarot-deck'],
    queryFn: async () => {
      const data = await astroFetchJson<{ cards: TarotCard[] }>(
        '/api/dashboard/features/tarot',
        { debugOrigin: 'hooks.use-tarot.deck' }
      )
      return data.cards ?? []
    },
    staleTime: Infinity,
  })
}
```

- `staleTime: Infinity` — tarot card definitions never change at runtime
- No auth required

---

## Endpoint

### `GET /api/dashboard/features/tarot`
`src/app/api/dashboard/features/tarot/route.ts`

**Auth:** None required — static content, same for all users.

**Returns:**
```json
{
  "cards": [
    {
      "id": "the-fool",
      "name": "The Fool",
      "arcana": "major",
      "suit": null,
      "number": 0,
      "keywords": ["beginnings", "innocence", "spontaneity"],
      "uprightMeaning": "...",
      "reversedMeaning": "...",
      "imageSrc": "/assets/tarot/the-fool.webp"
    },
    ...78 cards total
  ]
}
```

**Content source:** Server-side data file (curated card definitions).

---

## Component

### `TarotReadingPageClient`
`src/components/features/tarot/tarot-reading-page.tsx`

- Loads deck via `useTarotDeck()`
- User draws N cards (typically 3) from shuffled deck
- Each card flips on tap to reveal reading
- No personalization — same deck for all users

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Drawing cards | No gate — free feature |

---

*No dynamic data — tarot card definitions are genuinely static.*
