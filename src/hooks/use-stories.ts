'use client'

import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { StoryCategory } from '@/types'

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

async function fetchStoryCategories(): Promise<StoryCategory[]> {
  const json = await astroFetchJson<{ categories: StoryCategory[] }>('/api/dashboard/features/stories', {
    debugOrigin: 'hooks.use-stories.categories',
  })
  return json.categories
}

async function fetchStoryArticle(slug: string): Promise<StoryArticleData> {
  const json = await astroFetchJson<{ article: StoryArticleData }>(
    `/api/dashboard/features/stories/${slug}`,
    { debugOrigin: 'hooks.use-stories.article' }
  )
  return json.article
}

export function useStoryCategories() {
  return useQuery({
    queryKey: ['stories', 'categories'],
    queryFn: fetchStoryCategories,
    staleTime: 1000 * 60 * 60,
  })
}

export function useStoryArticle(slug: string) {
  return useQuery({
    queryKey: ['stories', 'article', slug],
    queryFn: () => fetchStoryArticle(slug),
    staleTime: 1000 * 60 * 60,
    enabled: !!slug,
  })
}
