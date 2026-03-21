import { useMemo } from 'react'
import { useToday } from '@/hooks/use-today'
import type { MoonData, MoonEvent, MoonPhase } from '@/types'
import type { ZodiacSign } from '@/lib/constants'

const PHASES: MoonPhase[] = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]

const SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

const WAXING = new Set<string>(['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous'])

function buildMoonData(
  moon: { phaseName: string; illuminationPct: number; sign: string | null },
  localDate: string
): MoonData {
  const today = new Date(localDate)
  const phaseName = moon.phaseName as MoonPhase
  const rawSign = (moon.sign ?? 'libra').toLowerCase()
  const sign = (SIGNS.includes(rawSign as ZodiacSign) ? rawSign : 'libra') as ZodiacSign
  const illumination = moon.illuminationPct
  const isWaxing = WAXING.has(phaseName)
  const age = isWaxing
    ? (illumination / 100) * 14.75
    : 14.75 + ((100 - illumination) / 100) * 14.75

  const phaseDays = 3.7
  const startDate = new Date(today.getTime() - (phaseDays / 2) * 86_400_000)
  const endDate = new Date(today.getTime() + (phaseDays / 2) * 86_400_000)

  const currentPhaseIdx = Math.max(0, PHASES.indexOf(phaseName))
  const currentSignIdx = Math.max(0, SIGNS.indexOf(sign))

  const upcomingEvents: MoonEvent[] = Array.from({ length: 4 }, (_, i) => {
    const nextPhaseIdx = (currentPhaseIdx + 1 + i) % PHASES.length
    const daysOut = phaseDays * (i + 1)
    const eventDate = new Date(today.getTime() + daysOut * 86_400_000)
    const nextSignIdx = (currentSignIdx + Math.round(daysOut / 2.5)) % SIGNS.length
    return {
      date: eventDate.toISOString(),
      type: PHASES[nextPhaseIdx],
      sign: SIGNS[nextSignIdx],
      description: '',
    }
  })

  return {
    currentPhase: {
      name: phaseName,
      illumination,
      age,
      sign,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      signInterpretation: '',
      phaseInterpretation: '',
      tags: [],
      isWaxing,
    },
    upcomingEvents,
  }
}

// ── useMoonPhase ──────────────────────────────────────────────────────────────
// Selector over useToday — extracts MoonData from the today section.

export function useMoonPhase() {
  const todayQuery = useToday()

  const data: MoonData | undefined = useMemo(() => {
    const moonRaw = todayQuery.data?.sections.today.data?.moon
    if (!moonRaw) return undefined
    const localDate = todayQuery.data?.subject.localDate ?? new Date().toISOString().slice(0, 10)
    return buildMoonData(moonRaw, localDate)
  }, [todayQuery.data])

  return { ...todayQuery, data }
}
