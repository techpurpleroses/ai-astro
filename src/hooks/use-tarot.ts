import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { TarotCard, MagicBallData } from '@/types'

export function useTarotDeck() {
  return useQuery<TarotCard[]>({
    queryKey: ['tarot-deck'],
    queryFn: async () => {
      const data = await astroFetchJson<{ cards: TarotCard[] }>(
        '/api/dashboard/features/tarot',
        { debugOrigin: 'hooks.use-tarot.deck' }
      )
      return data.cards ?? []
    },
    staleTime: Infinity,
  })
}

export function useMagicBallData() {
  return useQuery<MagicBallData>({
    queryKey: ['magic-ball'],
    queryFn: async () => {
      return astroFetchJson<MagicBallData>('/api/dashboard/features/magic-ball', {
        debugOrigin: 'hooks.use-tarot.magic-ball',
      })
    },
    staleTime: Infinity,
  })
}
