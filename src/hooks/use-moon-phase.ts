import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
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

function adaptMoonData(moon: { phaseName: string; illuminationPct: number; sign: string | null }): MoonData {
  const today = new Date()
  const phaseName = moon.phaseName as MoonPhase
  const rawSign = (moon.sign ?? 'libra').toLowerCase()
  const sign = (SIGNS.includes(rawSign as ZodiacSign) ? rawSign : 'libra') as ZodiacSign
  const illumination = moon.illuminationPct
  const isWaxing = WAXING.has(phaseName)
  const age = isWaxing ? (illumination / 100) * 14.75 : 14.75 + ((100 - illumination) / 100) * 14.75

  // Approximate phase start/end (each phase ~3.7 days)
  const phaseDays = 3.7
  const startDate = new Date(today.getTime() - (phaseDays / 2) * 86_400_000)
  const endDate = new Date(today.getTime() + (phaseDays / 2) * 86_400_000)

  const currentPhaseIdx = Math.max(0, PHASES.indexOf(phaseName))
  const currentSignIdx = Math.max(0, SIGNS.indexOf(sign))

  // Generate 4 upcoming phase transitions (~3.7 days apart)
  const upcomingEvents: MoonEvent[] = Array.from({ length: 4 }, (_, i) => {
    const nextPhaseIdx = (currentPhaseIdx + 1 + i) % PHASES.length
    const daysOut = phaseDays * (i + 1)
    const eventDate = new Date(today.getTime() + daysOut * 86_400_000)
    // Moon moves ~1 sign per 2.5 days
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

export function useMoonPhase() {
  return useQuery({
    queryKey: ['moon-phase'],
    queryFn: async (): Promise<MoonData> => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const json = await astroFetchJson<{
          data: { moon: { phaseName: string; illuminationPct: number; sign: string | null } }
        }>(`/api/astro/today?date=${today}`, {
          debugOrigin: 'hooks.use-moon-phase.today',
        })
        return adaptMoonData(json.data.moon)
      } catch {
        // Fall back to static JSON if API unavailable
        const data = await import('@/data/moon.json')
        return data as unknown as MoonData
      }
    },
    staleTime: 1000 * 60 * 60,
  })
}
