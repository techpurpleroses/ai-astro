import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { astroFetch } from '@/lib/client/astro-fetch'
import { useToday } from '@/hooks/use-today'
import type { HoroscopeReading, AlternativeHoroscope, DailyReadings, TarotCard, MagicBallData } from '@/types'

// ── useHoroscope ──────────────────────────────────────────────────────────────
// Selector over useToday — extracts HoroscopeReading from the horoscope section.
// The `_date` parameter is kept for API compatibility but the BFF owns the date.

export function useHoroscope(_date?: string) {
  const todayQuery = useToday()

  const data: HoroscopeReading | undefined = useMemo(() => {
    const raw = todayQuery.data?.sections.horoscope.data?.main
    if (!raw) return undefined
    return {
      date: todayQuery.data?.subject.localDate ?? '',
      title: raw.title,
      text: raw.text,
      energy: raw.energy,
      emotionalTone: raw.emotionalTone,
      challenges: raw.challenges,
      opportunities: raw.opportunities,
    }
  }, [todayQuery.data])

  return { ...todayQuery, data }
}

// ── useAlternativeHoroscope ───────────────────────────────────────────────────
// Selector over useToday — extracts category readings from the horoscope section.

export function useAlternativeHoroscope() {
  const todayQuery = useToday()

  const data: AlternativeHoroscope | undefined = useMemo(() => {
    const cats = todayQuery.data?.sections.horoscope.data?.categories
    if (!cats) return undefined
    return cats as AlternativeHoroscope
  }, [todayQuery.data])

  return { ...todayQuery, data }
}

// ── useDailyReadings ──────────────────────────────────────────────────────────
// Calls magic-ball and tarot feature endpoints (those remain separate).
// Dos/donts and love detail come from useToday data — no second horoscope call.

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
  const todayQuery = useToday()

  return useQuery({
    queryKey: ['daily-readings', todayQuery.dataUpdatedAt],
    queryFn: async (): Promise<DailyReadings> => {
      const today = todayQuery.data?.subject.localDate ?? new Date().toISOString().slice(0, 10)
      const luckyNumber = luckyNumberFromDate(today)

      const [mbRes, tarotRes] = await Promise.all([
        astroFetch('/api/dashboard/features/magic-ball', {
          debugOrigin: 'hooks.use-horoscope.daily.magic-ball',
        }).then((r) => r.ok ? r.json() as Promise<MagicBallData> : null),
        astroFetch('/api/dashboard/features/tarot', {
          debugOrigin: 'hooks.use-horoscope.daily.tarot',
        }).then((r) => r.ok ? r.json() as Promise<{ cards: TarotCard[] }> : null),
      ])

      const magicBall: MagicBallData = mbRes ?? { answers: [], suggestedQuestions: [] }
      const tarot = cardOfDay((tarotRes?.cards) ?? [], today) ?? {
        id: 'the-star', name: 'The Star', number: 17, arcana: 'major' as const,
        uprightMeaning: 'Hope, renewal, and spiritual guidance illuminate your path.',
        reversedMeaning: 'Despair, loss of faith, disconnection.',
        tipOfDay: 'Trust in the process and keep moving forward.',
        imageSlug: '',
      }

      // Dos/donts and love come from BFF data — no extra provider call
      const horoscopeMain = todayQuery.data?.sections.horoscope.data?.main
      const loveCategory = todayQuery.data?.sections.horoscope.data?.categories.love

      let dos: string[] = ['Trust your instincts', 'Connect with loved ones', 'Take time for yourself']
      let donts: string[] = ['Avoid unnecessary conflict', "Don't overcommit", 'Skip social media']
      let loveTip = 'Venus aligns with your heart today — be open to connection.'
      let loveDetail = 'The stars support romance and meaningful conversations. Express what you feel honestly.'

      if (horoscopeMain) {
        if (horoscopeMain.opportunities?.length) dos = horoscopeMain.opportunities
        if (horoscopeMain.challenges?.length) donts = horoscopeMain.challenges
      }
      if (loveCategory?.text) {
        loveDetail = loveCategory.text
        loveTip = loveDetail.slice(0, 120).trimEnd()
        if (loveTip.length < loveDetail.length) loveTip += '…'
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
    enabled: !todayQuery.isLoading,
    staleTime: 1000 * 60 * 60,
  })
}
