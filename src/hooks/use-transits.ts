import { useQuery } from '@tanstack/react-query'
import type { TransitsData, RetrogradData } from '@/types'

export function useTransits() {
  return useQuery({
    queryKey: ['transits'],
    queryFn: async (): Promise<TransitsData> => {
      const data = await import('@/data/transits.json')
      return data as unknown as TransitsData
    },
    staleTime: 1000 * 60 * 60,
  })
}

export function useRetrogrades() {
  return useQuery({
    queryKey: ['retrogrades'],
    queryFn: async (): Promise<RetrogradData> => {
      const data = await import('@/data/retrogrades.json')
      return data as unknown as RetrogradData
    },
    staleTime: 1000 * 60 * 60,
  })
}
