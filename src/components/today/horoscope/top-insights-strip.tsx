'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopCardsStrip } from '@/components/today/shared/top-cards-strip'
import { TodayStoryViewer, type TodayStoryCard } from '@/components/today/shared/today-story-viewer'
import { useHoroscope, useAlternativeHoroscope, useDailyReadings } from '@/hooks/use-horoscope'
import { useTodayCompatibility } from '@/hooks/use-compatibility'
import { useUserProfile } from '@/hooks/use-profile'
import { useToday } from '@/hooks/use-today'

// ── Real biorhythm computation ────────────────────────────────────────────────
// Physical: 23-day cycle, Emotional: 28-day cycle, Intellectual: 33-day cycle
// Each returns 0–100 where 50 = neutral, 100 = peak, 0 = trough

function biorhythm(birthDate: string, today: string, periodDays: number): number {
  const birth = new Date(birthDate).getTime()
  const now = new Date(today).getTime()
  const daysSinceBirth = (now - birth) / 86_400_000
  const value = Math.sin((2 * Math.PI * daysSinceBirth) / periodDays)
  return Math.round((value + 1) * 50) // scale -1..1 → 0..100
}

function useTodayInsightCards(): TodayStoryCard[] {
  const { data: horoscope } = useHoroscope()
  const { data: altHoroscope } = useAlternativeHoroscope()
  const { data: daily } = useDailyReadings()
  const { data: compat } = useTodayCompatibility()
  const { data: profile } = useUserProfile()
  const { data: today } = useToday()

  const userSign = profile?.sunSign?.toLowerCase()
  const birthDate = profile?.birthDate ?? null
  const localDate = today?.subject.localDate ?? new Date().toISOString().slice(0, 10)

  return useMemo(() => {
    // ── Today's Luck ──────────────────────────────────────────────────────────
    const luckSections = []
    if (horoscope) {
      luckSections.push({
        heading: horoscope.title || "Today's Cosmic Energy",
        body: horoscope.text,
        bullets: horoscope.opportunities?.slice(0, 4),
      })
      if (horoscope.energy !== undefined) {
        luckSections.push({
          heading: `Energy Level: ${horoscope.energy}%`,
          body: `Your emotional tone today is ${horoscope.emotionalTone || 'balanced'}. Channel this energy into your most important priorities.`,
          bullets: horoscope.challenges?.slice(0, 3),
        })
      }
    } else {
      luckSections.push({
        heading: "Today's Cosmic Energy",
        body: 'Small lucky signals are around you today. Stay practical and take the clean opportunity when it appears.',
      })
    }

    // ── Dating Tips ───────────────────────────────────────────────────────────
    const datingSections = []
    if (altHoroscope?.love) {
      datingSections.push({
        heading: 'Love & Attraction',
        body: altHoroscope.love.text,
        bullets: altHoroscope.love.keywords?.slice(0, 4),
      })
    }
    if (altHoroscope?.['your-day']) {
      datingSections.push({
        heading: 'Your Day Overall',
        body: altHoroscope['your-day'].text,
        bullets: altHoroscope['your-day'].keywords?.slice(0, 3),
      })
    }
    if (!datingSections.length) {
      datingSections.push({
        heading: 'Love & Attraction',
        body: 'Lead with honesty and warmth. A simple message will work better than overthinking.',
      })
    }

    // ── Biorhythms — real sinusoidal cycles from birth date ───────────────────
    let physical: number, emotional: number, intellectual: number
    if (birthDate) {
      physical = biorhythm(birthDate, localDate, 23)
      emotional = biorhythm(birthDate, localDate, 28)
      intellectual = biorhythm(birthDate, localDate, 33)
    } else {
      // Fallback to energy-based estimate when no birth date
      const energy = horoscope?.energy ?? 70
      physical = Math.min(100, Math.max(20, energy + 5))
      emotional = Math.min(100, Math.max(20, energy - 8))
      intellectual = Math.min(100, Math.max(20, energy + 12))
    }

    const bioSections = [
      {
        heading: `Physical Cycle — ${physical}%`,
        body:
          physical > 75
            ? 'Your body is in a strong phase. Great day for physical activity, workouts, or hands-on tasks.'
            : physical > 50
              ? 'Physical energy is moderate. Pace yourself and avoid overexertion.'
              : 'Low physical phase. Rest and recovery will serve you better than pushing hard.',
      },
      {
        heading: `Emotional Cycle — ${emotional}%`,
        body:
          emotional > 75
            ? 'Emotional clarity is high. Excellent time for important conversations and relationship decisions.'
            : emotional > 50
              ? 'Emotions are stable. Good day to address ongoing feelings with patience.'
              : 'Sensitive phase. Be gentle with yourself and avoid reactive decisions.',
      },
      {
        heading: `Intellectual Cycle — ${intellectual}%`,
        body:
          intellectual > 75
            ? 'Mental sharpness is peak. Ideal for problem-solving, learning, and creative work.'
            : intellectual > 50
              ? 'Thinking is clear and steady. Good for routine tasks and moderate planning.'
              : 'Mental energy is lower. Focus on simple tasks and avoid major decisions.',
        bullets: altHoroscope?.career?.keywords?.slice(0, 3),
      },
    ]

    // ── Daily Tips ────────────────────────────────────────────────────────────
    const tipSections = []
    if (daily?.dos?.length) {
      tipSections.push({
        heading: 'What the Stars Recommend',
        body: 'Cosmic guidance for making the most of today:',
        bullets: daily.dos.slice(0, 5),
      })
    }
    if (altHoroscope?.career) {
      tipSections.push({
        heading: 'Career & Focus',
        body: altHoroscope.career.text,
        bullets: altHoroscope.career.keywords?.slice(0, 3),
      })
    }
    if (!tipSections.length) {
      tipSections.push({
        heading: 'What the Stars Recommend',
        body: 'Keep actions short and consistent. Your momentum improves with one clear priority.',
      })
    }

    // ── Do / Don't ────────────────────────────────────────────────────────────
    const doSections = []
    if (daily?.dos?.length) {
      doSections.push({
        heading: '✓  Do Today',
        body: 'The universe supports these actions:',
        bullets: daily.dos.slice(0, 4),
      })
    }
    if (daily?.donts?.length) {
      doSections.push({
        heading: '✗  Avoid Today',
        body: 'Steer clear of these pitfalls:',
        bullets: daily.donts.slice(0, 4),
      })
    }
    if (!doSections.length) {
      doSections.push({ heading: '✓  Do', body: 'Follow your plan and trust the process.' })
      doSections.push({ heading: '✗  Dont', body: 'Avoid reacting emotionally to mixed signals.' })
    }

    // ── Daily Matches — from BFF compatibility section ────────────────────────
    const matchSections = []
    if (compat?.bestMatches?.length && userSign) {
      matchSections.push({
        heading: 'Your Best Cosmic Matches',
        body: `Based on your ${userSign.charAt(0).toUpperCase() + userSign.slice(1)} energy, these signs are most harmonious:`,
        bullets: compat.bestMatches.slice(0, 4),
      })
    }
    if (compat?.todaysMatches?.love?.length) {
      const topLove = compat.todaysMatches.love[0]
      matchSections.push({
        heading: "Today's Love Match",
        body: topLove.note,
        bullets: [
          `${topLove.sign1} + ${topLove.sign2} — ${topLove.score}% alignment`,
          ...(compat.todaysMatches.love.slice(1, 3).map((m) => `${m.sign1} + ${m.sign2} — ${m.score}%`)),
        ],
      })
    }
    if (!matchSections.length) {
      matchSections.push({
        heading: "Today's Best Matches",
        body: 'Water signs and earth signs create the most harmonious energy with you today.',
      })
    }

    return [
      {
        id: 'todays-luck',
        label: "Today's Luck",
        image: '/assets/today/horoscope/todays-luck.webp',
        accent: '#84CC16',
        sections: luckSections,
      },
      {
        id: 'dating-tips',
        label: 'Dating Tips',
        image: '/assets/today/horoscope/dating-tips.png',
        accent: '#F43F5E',
        sections: datingSections,
      },
      {
        id: 'biorhythms',
        label: 'Biorhythms',
        image: '/assets/today/horoscope/biorhythms.png',
        accent: '#06B6D4',
        sections: bioSections,
      },
      {
        id: 'daily-tips',
        label: 'Daily Tips',
        image: '/assets/today/horoscope/daily-tips.png',
        accent: '#F59E0B',
        sections: tipSections,
      },
      {
        id: 'do-dont',
        label: 'Do / Dont',
        image: '/assets/today/horoscope/do-dont.png',
        accent: '#A78BFA',
        sections: doSections,
      },
      {
        id: 'daily-matches',
        label: 'Daily Matches',
        image: '/assets/today/horoscope/daily-matches.png',
        accent: '#F43F5E',
        sections: matchSections,
      },
    ]
  }, [horoscope, altHoroscope, daily, compat, userSign, birthDate, localDate])
}

export function TopInsightsStrip() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const cards = useTodayInsightCards()

  const items = useMemo(
    () =>
      cards.map((card, i) => ({
        id: card.id,
        label: card.label,
        image: card.image,
        onClick: () => setOpenIndex(i),
      })),
    [cards],
  )

  return (
    <>
      <TopCardsStrip items={items} />

      <AnimatePresence>
        {openIndex !== null && (
          <TodayStoryViewer
            cards={cards}
            startIndex={openIndex}
            onClose={() => setOpenIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
