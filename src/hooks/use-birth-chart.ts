import { useQuery } from '@tanstack/react-query'
import type { BirthChartData } from '@/types'

export function useBirthChart() {
  return useQuery<BirthChartData>({
    queryKey: ['birth-chart'],
    queryFn: async () => {
      const data = await import('@/data/birth-chart.json')
      return data as unknown as BirthChartData
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
