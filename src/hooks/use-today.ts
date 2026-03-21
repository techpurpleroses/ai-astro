import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { TodayScreenDTO } from '@/app/api/dashboard/today/route'

export type { TodayScreenDTO }

export function useToday() {
  return useQuery<TodayScreenDTO>({
    queryKey: ['today'],
    queryFn: () =>
      astroFetchJson<TodayScreenDTO>('/api/dashboard/today', {
        debugOrigin: 'hooks.use-today',
      }),
    // 1-hour client-side stale time — BFF owns real freshness via Supabase caching
    staleTime: 1000 * 60 * 60,
  })
}
