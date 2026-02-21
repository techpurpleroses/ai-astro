import { useQuery } from '@tanstack/react-query'
import type { CompatibilityData } from '@/types'

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
