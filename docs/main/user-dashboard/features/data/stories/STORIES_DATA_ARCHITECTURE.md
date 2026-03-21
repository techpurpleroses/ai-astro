# Stories — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Stories feature.
>
> **Status as of 2026-03-21**

---

## Feature Overview

Stories are astrological editorial articles organized by category (Love, Career, etc.). Users browse category cards and tap into individual articles. Stories live at `/features/stories` and `/features/stories/[slug]`.

---

## Data Flows

```
Flow A — Category list:
  useStoryCategories()
    └─ GET /api/dashboard/features/stories
         → { categories: StoryCategory[] }
         → StoriesPageClient (category card grid)

Flow B — Article detail:
  useStoryArticle(slug)
    └─ GET /api/dashboard/features/stories/:slug
         → { article: StoryArticleData }
         → StoryArticlePageClient (section + bullet renderer)
```

---

## Hooks

### `useStoryCategories()`
`src/hooks/use-stories.ts`

```typescript
export function useStoryCategories() {
  return useQuery({
    queryKey: ['stories', 'categories'],
    queryFn: fetchStoryCategories,
    staleTime: 1000 * 60 * 60,  // 1h
  })
}
```

### `useStoryArticle(slug)`
`src/hooks/use-stories.ts`

```typescript
export function useStoryArticle(slug: string) {
  return useQuery({
    queryKey: ['stories', 'article', slug],
    queryFn: () => fetchStoryArticle(slug),
    staleTime: 1000 * 60 * 60,  // 1h
    enabled: !!slug,
  })
}
```

Both hooks use `staleTime: 1h` — editorial content, changes infrequently.

---

## Endpoints

### `GET /api/dashboard/features/stories`
`src/app/api/dashboard/features/stories/route.ts`

**Auth:** None required.

**Returns:**
```json
{
  "categories": [
    {
      "slug": "love-astrology",
      "title": "Love & Astrology",
      "subtitle": "...",
      "accentColor": "#F43F5E",
      "imageSrc": "/assets/stories/love.webp",
      "articles": [{ "slug": "...", "title": "...", "subtitle": "..." }]
    }
  ]
}
```

### `GET /api/dashboard/features/stories/:slug`
`src/app/api/dashboard/features/stories/[slug]/route.ts`

**Auth:** None required.

**Returns:**
```json
{
  "article": {
    "slug": "venus-retrograde-guide",
    "title": "...",
    "subtitle": "...",
    "accent": "#F43F5E",
    "sections": [{ "heading": "...", "body": "...", "bullets": [] }],
    "category": { ... }
  }
}
```

---

## Types

```typescript
// src/hooks/use-stories.ts
interface StoryArticleSection {
  heading: string
  body: string
  bullets: string[]
}

export interface StoryArticleData {
  slug: string
  title: string
  subtitle: string
  accent: string
  sections: StoryArticleSection[]
  category: StoryCategory
}
```

---

## Entitlement Gating

| Feature | Gate |
|---|---|
| Story browsing | No gate — free feature |
| Story articles | No gate — free feature |

---

*No dynamic data — stories are editorial content served from the BFF.*
