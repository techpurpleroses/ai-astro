import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { TransitsData, RetrogradData, Transit, AstroEvent } from '@/types'

type RawTransit = {
  title: string | null
  transitingPlanet: string
  targetPlanet: string | null
  aspectType: string | null
  interpretation: string | null
}

type RawEvent = {
  title: string
  eventType: string
  significance: 'low' | 'medium' | 'high'
  eventAt: string
}

type TodayApiResponse = {
  data: {
    transits: RawTransit[]
    events: RawEvent[]
  }
}

const VALID_ASPECTS = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile', 'quincunx'])
const VALID_EVENT_TYPES = new Set(['ingress', 'aspect', 'eclipse', 'retrograde', 'station'])

function adaptTransitsData(raw: RawTransit[], events: RawEvent[], today: Date): TransitsData {
  const todayStr = today.toISOString()
  const endStr = new Date(today.getTime() + 7 * 86_400_000).toISOString()

  const mapped: Transit[] = raw.map((t, i) => {
    const aspect = t.aspectType && VALID_ASPECTS.has(t.aspectType)
      ? t.aspectType as Transit['aspect']
      : 'conjunction'
    return {
      id: `transit-${i}`,
      transitingPlanet: t.transitingPlanet,
      natalPlanet: t.targetPlanet ?? '',
      aspect,
      orb: 0,
      startDate: todayStr,
      endDate: endStr,
      intensity: 'medium',
      title: t.title ?? `${t.transitingPlanet} ${aspect} ${t.targetPlanet ?? ''}`.trim(),
      interpretation: t.interpretation ?? '',
      tags: [],
    }
  })

  const mid = Math.ceil(mapped.length / 2)

  const firstEvent = events[0]
  const eventOfDay: AstroEvent = firstEvent
    ? {
        id: 'event-0',
        title: firstEvent.title,
        date: firstEvent.eventAt,
        type: VALID_EVENT_TYPES.has(firstEvent.eventType)
          ? firstEvent.eventType as AstroEvent['type']
          : 'aspect',
        description: '',
        significance: firstEvent.significance,
      }
    : mapped[0]
      ? {
          id: 'event-fallback',
          title: mapped[0].title,
          date: todayStr,
          type: 'aspect',
          description: '',
          significance: 'medium',
        }
      : {
          id: 'event-default',
          title: 'Planetary Alignment',
          date: todayStr,
          type: 'aspect',
          description: '',
          significance: 'medium',
        }

  return {
    shortTerm: mapped.slice(0, mid),
    longTerm: mapped.slice(mid),
    eventOfDay,
  }
}

function adaptRetrogradData(events: RawEvent[], today: Date): RetrogradData {
  const retroEvents = events.filter(
    (e) => e.eventType === 'retrograde' || e.eventType === 'station'
  )
  return {
    active: retroEvents.slice(0, 3).map((e) => {
      const planet = e.title.split(' ')[0] ?? 'Mercury'
      return {
        planet,
        startDate: today.toISOString(),
        endDate: new Date(today.getTime() + 30 * 86_400_000).toISOString(),
        sign: 'aries',
        isActive: true,
        interpretation: e.title,
        tags: [],
      }
    }),
    upcoming: [],
  }
}

async function fetchTodayData(): Promise<TodayApiResponse> {
  const date = new Date().toISOString().slice(0, 10)
  return astroFetchJson<TodayApiResponse>(`/api/astro/today?date=${date}`, {
    debugOrigin: 'hooks.use-transits.today',
  })
}

export function useTransits() {
  return useQuery({
    queryKey: ['transits'],
    queryFn: async (): Promise<TransitsData> => {
      try {
        const json = await fetchTodayData()
        return adaptTransitsData(json.data.transits, json.data.events, new Date())
      } catch {
        const data = await import('@/data/transits.json')
        return data as unknown as TransitsData
      }
    },
    staleTime: 1000 * 60 * 60,
  })
}

export function useRetrogrades() {
  return useQuery({
    queryKey: ['retrogrades'],
    queryFn: async (): Promise<RetrogradData> => {
      try {
        const json = await fetchTodayData()
        return adaptRetrogradData(json.data.events, new Date())
      } catch {
        const data = await import('@/data/retrogrades.json')
        return data as unknown as RetrogradData
      }
    },
    staleTime: 1000 * 60 * 60,
  })
}
