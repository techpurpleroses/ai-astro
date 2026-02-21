import { useQuery } from '@tanstack/react-query'
import type { MoonData } from '@/types'

export function useMoonPhase() {
  return useQuery({
    queryKey: ['moon-phase'],
    queryFn: async (): Promise<MoonData> => {
      const data = await import('@/data/moon.json')
      return data as unknown as MoonData
    },
    staleTime: 1000 * 60 * 60,
  })
}
