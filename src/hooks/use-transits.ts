import { useMemo } from 'react'
import { useToday } from '@/hooks/use-today'
import type { TransitsData, RetrogradData, Transit, AstroEvent } from '@/types'

// ── Shared mapping helpers ────────────────────────────────────────────────────

const VALID_ASPECTS = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile', 'quincunx'])
const VALID_EVENT_TYPES = new Set(['ingress', 'aspect', 'eclipse', 'retrograde', 'station'])

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

function mapTransits(raw: RawTransit[], events: RawEvent[], localDate: string): TransitsData {
  const todayStr = new Date(localDate).toISOString()
  const endStr = new Date(new Date(localDate).getTime() + 7 * 86_400_000).toISOString()

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

function mapRetrogrades(events: RawEvent[], localDate: string): RetrogradData {
  const retroEvents = events.filter(
    (e) => e.eventType === 'retrograde' || e.eventType === 'station'
  )
  const today = new Date(localDate)
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

// ── useTransits ───────────────────────────────────────────────────────────────
// Selector over useToday — extracts TransitsData from the today section.

export function useTransits() {
  const todayQuery = useToday()

  const data: TransitsData | undefined = useMemo(() => {
    const section = todayQuery.data?.sections.today
    if (!section?.data) return undefined
    const localDate = todayQuery.data?.subject.localDate ?? new Date().toISOString().slice(0, 10)
    return mapTransits(section.data.transits, section.data.events, localDate)
  }, [todayQuery.data])

  return { ...todayQuery, data }
}

// ── useRetrogrades ────────────────────────────────────────────────────────────
// Selector over useToday — extracts RetrogradData from the today section events.

export function useRetrogrades() {
  const todayQuery = useToday()

  const data: RetrogradData | undefined = useMemo(() => {
    const section = todayQuery.data?.sections.today
    if (!section?.data) return undefined
    const localDate = todayQuery.data?.subject.localDate ?? new Date().toISOString().slice(0, 10)
    return mapRetrogrades(section.data.events, localDate)
  }, [todayQuery.data])

  return { ...todayQuery, data }
}
