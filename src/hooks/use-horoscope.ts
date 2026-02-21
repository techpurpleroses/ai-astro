import { useQuery } from '@tanstack/react-query'
import type { HoroscopeReading, AlternativeHoroscope, DailyReadings } from '@/types'

export function useHoroscope(date: string) {
  return useQuery({
    queryKey: ['horoscope', date],
    queryFn: async (): Promise<HoroscopeReading | undefined> => {
      const data = await import('@/data/horoscope.json')
      return (data as { readings: HoroscopeReading[] }).readings.find((r) => r.date === date)
    },
    staleTime: 1000 * 60 * 60,
  })
}

export function useAlternativeHoroscope() {
  return useQuery({
    queryKey: ['alternative-horoscope'],
    queryFn: async (): Promise<AlternativeHoroscope> => {
      const data = await import('@/data/alternative-horoscope.json')
      return data as unknown as AlternativeHoroscope
    },
    staleTime: 1000 * 60 * 60,
  })
}

export function useDailyReadings() {
  return useQuery({
    queryKey: ['daily-readings'],
    queryFn: async (): Promise<DailyReadings> => {
      const data = await import('@/data/daily-readings.json')
      return data as unknown as DailyReadings
    },
    staleTime: 1000 * 60 * 60,
  })
}
