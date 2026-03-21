import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { astroFetch, astroFetchJson } from '@/lib/client/astro-fetch'
import { useToday } from '@/hooks/use-today'
import type { CompatibilityData, CompatibilityScore, ZodiacMatch } from '@/types'

// Curated editorial content: bestMatches + todaysMatches.
// Per-pair live scores are fetched separately via useCompatibilityPair().
export function useCompatibility() {
  return useQuery<CompatibilityData>({
    queryKey: ['compatibility'],
    queryFn: async () => {
      const data = await astroFetchJson<Omit<CompatibilityData, 'pairs'>>('/api/dashboard/compatibility', {
        debugOrigin: 'hooks.use-compatibility',
      })
      return { ...data, pairs: {} } as CompatibilityData
    },
    staleTime: 60 * 60 * 1000, // 1h — editorial content, stable
  })
}

// ── useTodayCompatibility ─────────────────────────────────────────────────────
// Selector over useToday — extracts best matches and today's love matches
// from the BFF compatibility section. Used by the Today tab only.

export interface TodayCompatibilityData {
  bestMatches: string[]
  todaysMatches: { love: ZodiacMatch[] }
  status: 'ok' | 'error' | 'skipped'
}

export function useTodayCompatibility() {
  const todayQuery = useToday()

  const data: TodayCompatibilityData | undefined = useMemo(() => {
    const compat = todayQuery.data?.sections.compatibility
    if (!compat) return undefined
    return {
      bestMatches: compat.bestMatches,
      todaysMatches: {
        love: compat.todaysMatches.map((m) => ({
          sign1: m.sign1 as ZodiacMatch['sign1'],
          sign2: m.sign2 as ZodiacMatch['sign2'],
          score: m.score,
          note: m.note,
        })),
      },
      status: compat.status,
    }
  }, [todayQuery.data])

  return { ...todayQuery, data }
}

// Live per-pair compatibility from the provider
export function useCompatibilityPair(signA: string | null, signB: string | null) {
  return useQuery<CompatibilityScore | null>({
    queryKey: ['compatibility-pair', signA?.toLowerCase(), signB?.toLowerCase()],
    queryFn: async (): Promise<CompatibilityScore | null> => {
      if (!signA || !signB) return null
      const res = await astroFetch(
        `/api/astro/compatibility?signA=${signA.toLowerCase()}&signB=${signB.toLowerCase()}`,
        { debugOrigin: 'hooks.use-compatibility.pair' }
      )
      if (!res.ok) return null
      const json = await res.json() as {
        data: {
          overall: number; love: number; career: number; friendship: number; sex: number
          summary: string; strengths: string[]; challenges: string[]
        }
        errors?: string[]
      }
      if (!json.data || json.errors?.length) return null
      return {
        overall: json.data.overall,
        love: json.data.love,
        career: json.data.career,
        friendship: json.data.friendship,
        sex: json.data.sex,
        summary: json.data.summary,
        strengths: json.data.strengths,
        challenges: json.data.challenges,
      }
    },
    enabled: !!signA && !!signB,
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days — compatibility facts are stable
  })
}

export function useZodiacSigns() {
  return useQuery({
    queryKey: ['zodiac-signs'],
    queryFn: async () => {
      const data = await import('@/data/zodiac-signs.json')
      return data.signs
    },
    staleTime: Infinity,
  })
}
