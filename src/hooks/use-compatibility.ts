import { useQuery } from '@tanstack/react-query'
import { astroFetch } from '@/lib/client/astro-fetch'
import type { CompatibilityData, CompatibilityScore } from '@/types'

// Still used by TodaysMatchesSection for daily zodiac match cards (static data)
export function useCompatibility() {
  return useQuery<CompatibilityData>({
    queryKey: ['compatibility'],
    queryFn: async () => {
      const data = await import('@/data/compatibility.json')
      return data as unknown as CompatibilityData
    },
    staleTime: Infinity,
  })
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
