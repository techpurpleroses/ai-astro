import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'

export interface UserProfile {
  userId: string
  isPlaceholder: boolean
  sunSign: string | null   // e.g. 'scorpio', null when placeholder
  timezone: string         // e.g. 'America/New_York'
  birthDate: string | null // YYYY-MM-DD, null when placeholder
}

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      return astroFetchJson<UserProfile>('/api/dashboard/profile', {
        debugOrigin: 'hooks.use-profile.get',
      })
    },
    staleTime: 5 * 60 * 1000,
  })
}

export interface UpdateProfileInput {
  birthDate: string       // YYYY-MM-DD
  birthTime?: string      // HH:MM
  birthTimezone?: string  // IANA e.g. 'America/New_York'
  birthPlaceName?: string
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation<UserProfile, Error, UpdateProfileInput>({
    mutationFn: async (input) => {
      return astroFetchJson<UserProfile>('/api/dashboard/profile', {
        debugOrigin: 'hooks.use-profile.update',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-profile'], data)
      // Invalidate the Today BFF — it owns horoscope, transits, moon, compatibility
      void queryClient.invalidateQueries({ queryKey: ['today'] })
      // Birth chart is tied to birth data — invalidate so it recomputes on next view
      void queryClient.invalidateQueries({ queryKey: ['birth-chart'] })
      // daily-readings re-triggers via todayQuery.dataUpdatedAt in its key
    },
  })
}
