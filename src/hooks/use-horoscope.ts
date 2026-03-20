import { useQuery } from '@tanstack/react-query'
import { astroFetch } from '@/lib/client/astro-fetch'
import { useUserProfile } from '@/hooks/use-profile'
import type { HoroscopeReading, AlternativeHoroscope, DailyReadings, TarotCard, MagicBallData } from '@/types'

// ── Shared API shapes ─────────────────────────────────────────────────────────

interface LiveHoroscopeDTO {
  main: {
    title: string
    text: string
    energy: number
    emotionalTone: string
    challenges: string[]
    opportunities: string[]
  }
  categories: {
    'your-day': { text: string; rating: number; keywords: string[] }
    love: { text: string; rating: number; keywords: string[] }
    health: { text: string; rating: number; keywords: string[] }
    career: { text: string; rating: number; keywords: string[] }
  }
}

async function fetchLiveHoroscope(sign: string, date: string): Promise<LiveHoroscopeDTO | null> {
  const res = await astroFetch(`/api/dashboard/horoscope?sign=${sign}&date=${date}`, {
    debugOrigin: 'hooks.use-horoscope.live',
  })
  if (!res.ok) return null
  const json = await res.json() as { data: LiveHoroscopeDTO; errors?: string[] }
  if (!json.data || json.errors?.length) return null
  return json.data
}

// ── useHoroscope ──────────────────────────────────────────────────────────────

export function useHoroscope(date: string) {
  const { data: profile } = useUserProfile()
  const sign = profile?.sunSign ?? null

  return useQuery({
    queryKey: ['horoscope', date, sign ?? 'no-sign'],
    queryFn: async (): Promise<HoroscopeReading | undefined> => {
      if (sign) {
        const live = await fetchLiveHoroscope(sign, date)
        if (live) {
          return {
            date,
            title: live.main.title,
            text: live.main.text,
            energy: live.main.energy,
            emotionalTone: live.main.emotionalTone,
            challenges: live.main.challenges,
            opportunities: live.main.opportunities,
          }
        }
      }
      // Fallback: static JSON
      const data = await import('@/data/horoscope.json')
      const readings = (data as { readings: HoroscopeReading[] }).readings
      if (!readings.length) return undefined
      const exact = readings.find((r) => r.date === date)
      if (exact) return exact
      const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date))
      return [...sorted].reverse().find((r) => r.date <= date) ?? sorted[sorted.length - 1]
    },
    enabled: profile !== undefined,
    staleTime: 1000 * 60 * 60,
  })
}

// ── useAlternativeHoroscope ───────────────────────────────────────────────────

export function useAlternativeHoroscope() {
  const { data: profile } = useUserProfile()
  const sign = profile?.sunSign ?? null
  const date = new Date().toISOString().slice(0, 10)

  return useQuery({
    queryKey: ['alternative-horoscope', sign ?? 'no-sign'],
    queryFn: async (): Promise<AlternativeHoroscope> => {
      if (sign) {
        const live = await fetchLiveHoroscope(sign, date)
        if (live?.categories) return live.categories as AlternativeHoroscope
      }
      const data = await import('@/data/alternative-horoscope.json')
      return data as unknown as AlternativeHoroscope
    },
    enabled: profile !== undefined,
    staleTime: 1000 * 60 * 60,
  })
}

// ── useDailyReadings ──────────────────────────────────────────────────────────

function luckyNumberFromDate(date: string): number {
  const hash = date.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return (hash % 9) + 1
}

function cardOfDay(cards: TarotCard[], date: string): TarotCard | undefined {
  if (!cards.length) return undefined
  const hash = date.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return cards[hash % cards.length]
}

export function useDailyReadings() {
  const { data: profile } = useUserProfile()
  const sign = profile?.sunSign ?? null

  return useQuery({
    queryKey: ['daily-readings', sign ?? 'no-sign'],
    queryFn: async (): Promise<DailyReadings> => {
      const today = new Date().toISOString().slice(0, 10)
      const luckyNumber = luckyNumberFromDate(today)

      // Fetch magic ball + tarot in parallel, horoscope if we have a sign
      const [mbRes, tarotRes, horoscopeData] = await Promise.all([
        astroFetch('/api/dashboard/features/magic-ball', {
          debugOrigin: 'hooks.use-horoscope.daily.magic-ball',
        }).then((r) => r.ok ? r.json() as Promise<MagicBallData> : null),
        astroFetch('/api/dashboard/features/tarot', {
          debugOrigin: 'hooks.use-horoscope.daily.tarot',
        }).then((r) => r.ok ? r.json() as Promise<{ cards: TarotCard[] }> : null),
        sign ? fetchLiveHoroscope(sign, today) : null,
      ])

      const magicBall: MagicBallData = mbRes ?? { answers: [], suggestedQuestions: [] }
      const tarot = cardOfDay((tarotRes?.cards) ?? [], today) ?? {
        id: 'the-star', name: 'The Star', number: 17, arcana: 'major' as const,
        uprightMeaning: 'Hope, renewal, and spiritual guidance illuminate your path.',
        reversedMeaning: 'Despair, loss of faith, disconnection.',
        tipOfDay: 'Trust in the process and keep moving forward.',
        imageSlug: '',
      }

      let dos: string[] = ['Trust your instincts', 'Connect with loved ones', 'Take time for yourself']
      let donts: string[] = ['Avoid unnecessary conflict', "Don't overcommit", 'Skip social media']
      let loveTip = 'Venus aligns with your heart today — be open to connection.'
      let loveDetail = 'The stars support romance and meaningful conversations. Express what you feel honestly.'

      if (horoscopeData) {
        if (horoscopeData.main.opportunities?.length) dos = horoscopeData.main.opportunities
        if (horoscopeData.main.challenges?.length) donts = horoscopeData.main.challenges
        if (horoscopeData.categories.love?.text) {
          loveDetail = horoscopeData.categories.love.text
          loveTip = loveDetail.slice(0, 120).trimEnd()
          if (loveTip.length < loveDetail.length) loveTip += '…'
        }
      }

      return {
        tarot,
        magicBall,
        loveTip,
        loveDetail,
        dos,
        donts,
        luckyNumber,
        luckyNumberExplanation: `${luckyNumber} resonates with today's planetary frequency.`,
        trendingQuestion: magicBall.suggestedQuestions?.[0] ?? 'Will things improve soon?',
      }
    },
    enabled: profile !== undefined,
    staleTime: 1000 * 60 * 60,
  })
}
