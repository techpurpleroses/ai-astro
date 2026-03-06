'use client'

import { useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { TopCardsStrip } from '@/components/today/shared/top-cards-strip'

type InsightKey =
  | 'todays-luck'
  | 'dating-tips'
  | 'biorhythms'
  | 'daily-tips'
  | 'do-dont'
  | 'daily-matches'

const INSIGHT_LABELS: Record<InsightKey, string> = {
  'todays-luck': "Today's Luck",
  'dating-tips': 'Dating Tips',
  biorhythms: 'Biorhythms',
  'daily-tips': 'Daily Tips',
  'do-dont': 'Do / Dont',
  'daily-matches': 'Daily Matches',
}

const INSIGHT_NOTES: Record<Exclude<InsightKey, 'daily-matches'>, string> = {
  'todays-luck': 'Small lucky signals are around you today. Stay practical and take the clean opportunity.',
  'dating-tips': 'Lead with honesty and warmth. A simple message will work better than overthinking.',
  biorhythms: 'Energy is better in focused sprints. Pace your day and avoid draining multitasking.',
  'daily-tips': 'Keep actions short and consistent. Your momentum improves with one clear priority.',
  'do-dont': 'Do: follow your plan. Dont: react emotionally to noise or mixed signals.',
}

export function TopInsightsStrip() {
  const [openInsight, setOpenInsight] = useState<Exclude<InsightKey, 'daily-matches'> | null>(null)

  const items = useMemo(
    () => [
      {
        id: 'todays-luck',
        label: INSIGHT_LABELS['todays-luck'],
        image: '/assets/today/horoscope/todays-luck.webp',
        onClick: () => setOpenInsight('todays-luck'),
      },
      {
        id: 'dating-tips',
        label: INSIGHT_LABELS['dating-tips'],
        image: '/assets/today/horoscope/dating-tips.png',
        onClick: () => setOpenInsight('dating-tips'),
      },
      {
        id: 'biorhythms',
        label: INSIGHT_LABELS.biorhythms,
        image: '/assets/today/horoscope/biorhythms.png',
        onClick: () => setOpenInsight('biorhythms'),
      },
      {
        id: 'daily-tips',
        label: INSIGHT_LABELS['daily-tips'],
        image: '/assets/today/horoscope/daily-tips.png',
        onClick: () => setOpenInsight('daily-tips'),
      },
      {
        id: 'do-dont',
        label: INSIGHT_LABELS['do-dont'],
        image: '/assets/today/horoscope/do-dont.png',
        onClick: () => setOpenInsight('do-dont'),
      },
      {
        id: 'daily-matches',
        label: INSIGHT_LABELS['daily-matches'],
        image: '/assets/today/horoscope/daily-matches.png',
        href: '/compatibility/today-matches',
      },
    ],
    [],
  )

  return (
    <>
      <TopCardsStrip items={items} />

      <BottomSheet
        open={!!openInsight}
        onClose={() => setOpenInsight(null)}
        title={openInsight ? INSIGHT_LABELS[openInsight] : 'Insight'}
      >
        {openInsight && <p className="text-sm leading-relaxed text-text-secondary">{INSIGHT_NOTES[openInsight]}</p>}
      </BottomSheet>
    </>
  )
}
