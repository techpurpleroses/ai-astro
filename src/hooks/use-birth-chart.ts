import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { BirthChartData } from '@/types'

interface BirthChartApiResponse {
  data: BirthChartData | null
  isPlaceholder?: boolean
}

export function useBirthChart() {
  return useQuery<BirthChartData | null>({
    queryKey: ['birth-chart'],
    queryFn: async () => {
      const res = await astroFetchJson<BirthChartApiResponse>('/api/dashboard/birth-chart', {
        debugOrigin: 'hooks.use-birth-chart',
      })
      return res.data
    },
    // Birth chart is computed from fixed birth data — 24h staleTime is appropriate.
    // Invalidated explicitly when the user updates their birth date/time/place.
    staleTime: 24 * 60 * 60 * 1000,
  })
}
