'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopCardsStrip } from '@/components/today/shared/top-cards-strip'
import { TodayStoryViewer, type TodayStoryCard } from '@/components/today/shared/today-story-viewer'
import { useTransits, useRetrogrades } from '@/hooks/use-transits'

function useAstroCards(): TodayStoryCard[] {
  const { data: transits } = useTransits()
  const { data: retrogrades } = useRetrogrades()

  return useMemo(() => {
    // ── Short-Term Transit ─────────────────────────────────────────────────
    const shortSections = []
    if (transits?.shortTerm?.length) {
      transits.shortTerm.slice(0, 3).forEach((t) => {
        shortSections.push({
          heading: t.title,
          body: t.interpretation || `${t.transitingPlanet} ${t.aspect} ${t.natalPlanet} — this transit activates focused energy in your chart.`,
        })
      })
    } else {
      shortSections.push({
        heading: 'Short-Term Planetary Influences',
        body: 'Active transits are shaping your immediate reality over the next 7 days. Stay attuned to shifts in energy and mood.',
      })
    }

    // ── Long-Term Transit ──────────────────────────────────────────────────
    const longSections = []
    if (transits?.longTerm?.length) {
      transits.longTerm.slice(0, 3).forEach((t) => {
        longSections.push({
          heading: t.title,
          body: t.interpretation || `${t.transitingPlanet} ${t.aspect} ${t.natalPlanet} — a sustained influence reshaping deeper patterns.`,
        })
      })
    } else {
      longSections.push({
        heading: 'Long-Term Cosmic Themes',
        body: 'Slower-moving planets are creating sustained influences in your chart over weeks or months.',
      })
    }
    longSections.push({
      heading: 'How to Work with Long-Term Transits',
      body: 'Unlike quick transits, these ask for patience. They reward consistent effort and inner reflection rather than immediate action.',
      bullets: [
        'Journal your patterns over the coming weeks',
        'Notice recurring themes in relationships and work',
        'Use meditation or breathwork to integrate deeper shifts',
      ],
    })

    // ── Active Retrogrades ─────────────────────────────────────────────────
    const retroSections = []
    if (retrogrades?.active?.length) {
      retrogrades.active.forEach((r) => {
        retroSections.push({
          heading: `${r.planet} Retrograde in ${r.sign.charAt(0).toUpperCase() + r.sign.slice(1)}`,
          body: r.interpretation || `${r.planet} is moving retrograde, asking you to review, reassess, and realign matters governed by this planet.`,
        })
      })
    } else {
      retroSections.push({
        heading: 'No Major Retrogrades Active',
        body: 'All major planets are moving direct. This is an excellent period for forward momentum and starting new ventures.',
      })
    }
    retroSections.push({
      heading: 'Navigating Retrogrades',
      body: 'Retrogrades invite reflection, not paralysis. Use this time to revisit what needs attention.',
      bullets: [
        'Back up important files and data',
        'Review contracts before signing',
        'Reconnect with people from the past',
        'Avoid major irreversible decisions if possible',
      ],
    })

    // ── What Are Transits? ─────────────────────────────────────────────────
    const explainSections = [
      {
        heading: 'What Are Planetary Transits?',
        body: 'Transits occur when a planet in the sky forms a geometric angle to a planet in your birth chart. This activates the themes of both planets in your life.',
      },
      {
        heading: 'How to Read Your Transits',
        body: 'Each transit has a flavor determined by the aspect type: conjunctions intensify, trines flow, squares challenge, and oppositions create awareness.',
        bullets: [
          'Conjunction (0°) — intensification and new beginnings',
          'Trine (120°) — ease, flow, and natural talent',
          'Square (90°) — tension that drives growth',
          'Opposition (180°) — balance and external reflection',
          'Sextile (60°) — opportunity that requires action',
        ],
      },
      {
        heading: 'Intensity Levels',
        body: 'Not all transits hit equally hard. Outer planets (Saturn, Uranus, Neptune, Pluto) create the most lasting shifts. Inner planets (Sun, Mercury, Venus, Mars) move quickly and create shorter windows.',
      },
    ]

    return [
      {
        id: 'short-transit',
        label: 'Your Short-Term Transit',
        image: '/assets/today/events/short-transit.webp',
        accent: '#22D3EE',
        sections: shortSections,
      },
      {
        id: 'long-transit',
        label: 'Your Long-Term Transit',
        image: '/assets/today/events/long-transit.webp',
        accent: '#06B6D4',
        sections: longSections,
      },
      {
        id: 'active-retrogrades',
        label: 'Active Retrogrades',
        image: '/assets/today/events/active-retrogrades.webp',
        accent: '#818CF8',
        sections: retroSections,
      },
      {
        id: 'what-are-transits',
        label: 'What Are Transits?',
        image: '/assets/today/events/what-are-transits.webp',
        accent: '#34D399',
        sections: explainSections,
      },
    ]
  }, [transits, retrogrades])
}

export function AstroCardStrip() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const cards = useAstroCards()

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
      <TopCardsStrip
        items={items}
        borderColor="rgba(34,211,238,0.86)"
        minCardHeight={116}
        cardHeightRatio={1.1}
      />

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
