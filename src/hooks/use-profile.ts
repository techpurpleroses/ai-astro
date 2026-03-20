import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'

export interface UserProfile {
  userId: string
  isPlaceholder: boolean
  sunSign: string | null   // e.g. 'scorpio', null when placeholder
  timezone: string         // e.g. 'America/New_York'
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
      // Replace the cached profile so all dependent queries (horoscope, daily-readings) re-fire
      queryClient.setQueryData(['user-profile'], data)
      // Invalidate sign-dependent queries so they re-fetch with the new sign
      void queryClient.invalidateQueries({ queryKey: ['horoscope'] })
      void queryClient.invalidateQueries({ queryKey: ['alternative-horoscope'] })
      void queryClient.invalidateQueries({ queryKey: ['daily-readings'] })
    },
  })
}
