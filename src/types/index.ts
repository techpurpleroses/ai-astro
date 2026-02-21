import type { ZodiacSign, Planet } from '@/lib/constants'

/* ─── Horoscope ─────────────────────────────────────────── */

export interface HoroscopeReading {
  date: string
  title: string
  text: string
  energy: number       // 0-100
  emotionalTone: string
  challenges: string[]
  opportunities: string[]
}

export interface AlternativeHoroscope {
  'your-day': CategoryReading
  love: CategoryReading
  health: CategoryReading
  career: CategoryReading
}

export interface CategoryReading {
  text: string
  rating: number   // 1-5
  keywords: string[]
}

export type HoroscopeCategory = keyof AlternativeHoroscope

/* ─── Daily Readings ─────────────────────────────────────── */

export interface TarotCard {
  id: string
  name: string
  number: number
  arcana: 'major' | 'minor'
  suit?: string
  uprightMeaning: string
  reversedMeaning: string
  tipOfDay: string
  imageSlug: string
}

export interface MagicBallData {
  answers: MagicBallAnswer[]
  suggestedQuestions: string[]
}

export interface MagicBallAnswer {
  id: string
  answer: string
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface DailyReadings {
  tarot: TarotCard
  magicBall: MagicBallData
  loveTip: string
  loveDetail: string
  dos: string[]
  donts: string[]
  luckyNumber: number
  luckyNumberExplanation: string
  trendingQuestion: string
}

/* ─── Transits ──────────────────────────────────────────── */

export type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx'

export interface Transit {
  id: string
  transitingPlanet: string
  natalPlanet: string
  aspect: AspectType
  orb: number
  startDate: string
  endDate: string
  intensity: 'low' | 'medium' | 'high'
  title: string
  interpretation: string
  tags: string[]
}

export interface Retrograde {
  planet: string
  startDate: string
  endDate: string
  sign: string
  isActive: boolean
  interpretation: string
  tags: string[]
}

export interface AstroEvent {
  id: string
  title: string
  date: string
  type: 'ingress' | 'aspect' | 'eclipse' | 'retrograde' | 'station'
  description: string
  significance: 'low' | 'medium' | 'high'
}

export interface TransitsData {
  shortTerm: Transit[]
  longTerm: Transit[]
  eventOfDay: AstroEvent
}

export interface RetrogradData {
  active: Retrograde[]
  upcoming: Retrograde[]
}

/* ─── Moon ──────────────────────────────────────────────── */

export type MoonPhase =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export interface MoonPhaseData {
  name: MoonPhase
  illumination: number    // 0-100 percentage
  age: number             // days since new moon
  sign: ZodiacSign
  startDate: string
  endDate: string
  signInterpretation: string
  phaseInterpretation: string
  tags: string[]
  isWaxing: boolean
}

export interface MoonEvent {
  date: string
  type: MoonPhase
  sign: ZodiacSign
  description: string
}

export interface MoonData {
  currentPhase: MoonPhaseData
  upcomingEvents: MoonEvent[]
}

/* ─── Birth Chart ───────────────────────────────────────── */

export interface PlanetPosition {
  name: string
  glyph: string
  sign: string
  house: number
  degree: number
  absoluteDegree: number
  isRetrograde: boolean
  description: string
}

export interface HousePosition {
  number: number
  sign: string
  degree: number
  absoluteDegree: number
}

export interface Aspect {
  planet1: string
  planet2: string
  type: AspectType
  orb: number
  degree1: number
  degree2: number
}

export interface StellarComposition {
  fire: number
  earth: number
  air: number
  water: number
  cardinal: number
  fixed: number
  mutable: number
}

export interface BirthChartData {
  bigThree: {
    sun:       { sign: string; degree: number; glyph: string }
    moon:      { sign: string; degree: number; glyph: string }
    ascendant: { sign: string; degree: number; glyph: string }
  }
  stellarComposition: StellarComposition
  planets: PlanetPosition[]
  houses: HousePosition[]
  aspects: Aspect[]
  dailyTransits: {
    shortTerm: Transit[]
    longTerm: Transit[]
  }
}

/* ─── Advisors ──────────────────────────────────────────── */

export interface Advisor {
  id: string
  name: string
  avatar?: string
  specialty: string
  specialtyIcon: string
  rating: number
  reviewCount: number
  isOnline: boolean
  ratePerMinute: number
  tagline: string
  bio: string
  zodiacSign: string
  yearsOfExperience: number
  responseTime: string
  skills: string[]
  languages: string[]
  totalSessions: number
}

export interface ChatMessage {
  id: string
  advisorId: string
  role: 'user' | 'advisor'
  content: string
  timestamp: string
  tarotCard?: TarotCard
}

/* ─── Compatibility ─────────────────────────────────────── */

export interface CompatibilityScore {
  overall: number
  love: number
  career: number
  friendship: number
  sex: number
  summary: string
  strengths: string[]
  challenges: string[]
}

export interface ZodiacMatch {
  sign1: ZodiacSign
  sign2: ZodiacSign
  score: number
  note: string
}

export interface CompatibilityData {
  pairs: Record<string, CompatibilityScore>
  bestMatches: Record<ZodiacSign, ZodiacSign[]>
  todaysMatches: {
    love: ZodiacMatch[]
    career: ZodiacMatch[]
    friendship: ZodiacMatch[]
    sex: ZodiacMatch[]
  }
}
