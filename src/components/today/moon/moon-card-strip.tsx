'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopCardsStrip } from '@/components/today/shared/top-cards-strip'
import { TodayStoryViewer, type TodayStoryCard } from '@/components/today/shared/today-story-viewer'
import { useMoonPhase } from '@/hooks/use-moon-phase'

const MOON_PHASE_RITUALS: Record<string, string[]> = {
  'New Moon': [
    'Set clear intentions for the lunar cycle ahead',
    'Write your goals and desires in a journal',
    'Plant seeds — literal or metaphorical',
    'Meditate in silence to connect with new beginnings',
  ],
  'Waxing Crescent': [
    'Take the first concrete steps toward your intentions',
    'Research and gather resources for your goals',
    'Start conversations you have been postponing',
    'Focus on one priority at a time',
  ],
  'First Quarter': [
    'Push through resistance — momentum is building',
    'Make a decision you have been delaying',
    'Exercise to match the rising physical energy',
    'Collaborate and seek help where needed',
  ],
  'Waxing Gibbous': [
    'Refine and polish your ongoing projects',
    'Gather feedback from trusted people',
    'Stay patient — completion is near',
    'Review your intentions from the New Moon',
  ],
  'Full Moon': [
    'Release what no longer serves you',
    'Celebrate progress and acknowledge wins',
    'Charge crystals or sacred objects under moonlight',
    'Have important conversations — emotions run high',
    'Practice gratitude for what has manifested',
  ],
  'Waning Gibbous': [
    'Share your knowledge and give back to others',
    'Reflect on lessons learned this cycle',
    'Begin decluttering physical and mental space',
    'Express gratitude through action',
  ],
  'Last Quarter': [
    'Let go of habits and patterns that drain you',
    'Forgive yourself and others for this cycle',
    'Deep clean your living space',
    'Take time for rest and introspection',
  ],
  'Waning Crescent': [
    'Rest deeply and conserve energy',
    'Spend time in silence and solitude',
    'Surrender outcomes and trust the process',
    'Prepare your intentions for the next New Moon',
  ],
}

const MOON_PHASE_DO_DONTS: Record<string, { dos: string[]; donts: string[] }> = {
  'New Moon': {
    dos: ['Start new projects', 'Set intentions', 'Plant seeds', 'Begin detoxes'],
    donts: ['Make rushed decisions', 'Overcommit to others', 'Skip meditation'],
  },
  'Full Moon': {
    dos: ['Release emotional baggage', 'Celebrate achievements', 'Connect deeply with others'],
    donts: ['Start major new ventures', 'Make impulsive purchases', 'Avoid your emotions'],
  },
  'Waning Gibbous': {
    dos: ['Share wisdom', 'Declutter', 'Reflect on the cycle'],
    donts: ['Force new beginnings', 'Overextend your energy'],
  },
  'Waxing Crescent': {
    dos: ['Take bold first steps', 'Build momentum', 'Seek resources'],
    donts: ['Second-guess your intentions', 'Wait for perfect conditions'],
  },
  'First Quarter': {
    dos: ['Commit fully to your goals', 'Overcome obstacles', 'Be decisive'],
    donts: ['Back down from challenges', 'Procrastinate on key decisions'],
  },
  'Waxing Gibbous': {
    dos: ['Refine and improve', 'Seek feedback', 'Stay consistent'],
    donts: ['Rush to completion', 'Compare your progress to others'],
  },
  'Last Quarter': {
    dos: ['Let go of the old', 'Forgive', 'Rest and restore'],
    donts: ['Cling to what is passing', 'Start major new commitments'],
  },
  'Waning Crescent': {
    dos: ['Rest deeply', 'Surrender control', 'Journal your insights'],
    donts: ['Push hard on projects', 'Make big life decisions'],
  },
}

function useMoonCards(): TodayStoryCard[] {
  const { data: moonData } = useMoonPhase()

  return useMemo(() => {
    const phase = moonData?.currentPhase
    const phaseName = phase?.name ?? 'Waning Gibbous'
    const sign = phase?.sign
      ? phase.sign.charAt(0).toUpperCase() + phase.sign.slice(1)
      : 'Libra'
    const illumination = phase?.illumination ?? 72
    const isWaxing = phase?.isWaxing ?? false

    const rituals = MOON_PHASE_RITUALS[phaseName] ?? MOON_PHASE_RITUALS['Full Moon']
    const doDont = MOON_PHASE_DO_DONTS[phaseName] ?? MOON_PHASE_DO_DONTS['Full Moon']

    // ── Phase card (waning gibbous / current phase) ────────────────────────
    const phaseSections = [
      {
        heading: `${phaseName} — ${illumination}% Illuminated`,
        body:
          isWaxing
            ? `The moon is growing toward fullness. This is a time of building, expanding, and taking action. Energy is rising and momentum favors bold moves.`
            : `The moon is releasing energy as it wanes. This phase supports reflection, letting go, and preparing for the next cycle. Slow down and integrate.`,
      },
      {
        heading: 'What This Phase Activates',
        body: 'Each moon phase energizes different areas of life. Align your actions with the natural lunar rhythm.',
        bullets: rituals.slice(0, 3),
      },
    ]
    if (moonData?.upcomingEvents?.length) {
      const next = moonData.upcomingEvents[0]
      const days = Math.round(
        (new Date(next.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      phaseSections.push({
        heading: `Next: ${next.type} in ${days} days`,
        body: `The moon will enter ${next.sign.charAt(0).toUpperCase() + next.sign.slice(1)} during the ${next.type} phase. Begin preparing for that energetic shift.`,
      })
    }

    // ── Moon in Sign card ──────────────────────────────────────────────────
    const signSections = [
      {
        heading: `Moon in ${sign}`,
        body: getMoonInSignBody(phase?.sign ?? 'libra'),
      },
      {
        heading: `How Moon in ${sign} Affects You`,
        body: getMoonInSignEffect(phase?.sign ?? 'libra'),
        bullets: getMoonInSignTips(phase?.sign ?? 'libra'),
      },
    ]

    // ── Moon Rituals ───────────────────────────────────────────────────────
    const ritualSections = [
      {
        heading: `${phaseName} Rituals`,
        body: 'These practices are especially powerful during this lunar phase. Align your energy with the moon.',
        bullets: rituals,
      },
      {
        heading: 'Quick Ritual: Moon Journaling',
        body: 'Take 10 minutes in quiet. Light a candle if you have one. Write your answers to: What am I ready to release? What do I want to call in next?',
      },
    ]

    // ── Do / Don't ─────────────────────────────────────────────────────────
    const moonDoSections = [
      {
        heading: `✓  Do During ${phaseName}`,
        body: 'Work with the lunar current, not against it:',
        bullets: doDont.dos,
      },
      {
        heading: `✗  Avoid During ${phaseName}`,
        body: 'These actions work against the natural lunar flow:',
        bullets: doDont.donts,
      },
      {
        heading: 'Timing Your Actions',
        body: `The ${phaseName} lasts approximately 3-4 days. Use this window intentionally and you will notice a shift in how your efforts land.`,
      },
    ]

    return [
      {
        id: 'waning-gibbous',
        label: phaseName,
        image: '/assets/today/moon/waning-gibbous.webp',
        accent: '#E7C44F',
        sections: phaseSections,
      },
      {
        id: 'moon-in-libra',
        label: `Moon in ${sign}`,
        image: '/assets/today/moon/moon-in-libra.webp',
        accent: '#F59E0B',
        sections: signSections,
      },
      {
        id: 'moon-rituals',
        label: 'Moon Rituals',
        image: '/assets/today/moon/moon-rituals.webp',
        accent: '#C084FC',
        sections: ritualSections,
      },
      {
        id: 'moon-do-dont',
        label: 'Do / Dont',
        image: '/assets/today/moon/do-dont.webp',
        accent: '#FB923C',
        sections: moonDoSections,
      },
    ]
  }, [moonData])
}

// ── Sign interpretations ─────────────────────────────────────────────────────
function getMoonInSignBody(sign: string): string {
  const map: Record<string, string> = {
    aries: 'The moon in Aries sparks impulse and independence. Emotions run hot and fast. Courage is high but patience is low.',
    taurus: 'The moon in Taurus brings comfort-seeking and sensory pleasure. Emotions stabilize and practical matters take priority.',
    gemini: 'The moon in Gemini heightens curiosity and communication. The mind races and social energy is high.',
    cancer: 'The moon is at home in Cancer. Deep emotional sensitivity, nurturing instincts, and a pull toward home and family.',
    leo: 'The moon in Leo demands expression and recognition. Creativity and drama are amplified — the heart wants to be seen.',
    virgo: 'The moon in Virgo brings analytical precision to emotions. There is an urge to fix, organize, and improve everything.',
    libra: 'The moon in Libra seeks harmony and connection. Social graces are heightened and decisions feel easier with a partner.',
    scorpio: 'The moon in Scorpio goes deep. Emotional intensity, hidden desires, and transformative urges surface.',
    sagittarius: 'The moon in Sagittarius craves freedom and truth. Restlessness and optimism mix for an adventurous emotional day.',
    capricorn: 'The moon in Capricorn turns emotions practical. Ambition drives feelings and discipline feels more natural.',
    aquarius: 'The moon in Aquarius detaches from personal emotion and focuses on collective ideas and innovation.',
    pisces: 'The moon in Pisces dissolves boundaries. Empathy is overwhelming, intuition is strong, and dreams speak loudly.',
  }
  return map[sign] ?? map['libra']
}

function getMoonInSignEffect(sign: string): string {
  const map: Record<string, string> = {
    aries: 'Expect quick emotional shifts. Great time for bold actions but arguments may flare more easily.',
    taurus: 'Slow and steady energy prevails. Perfect for enjoying simple pleasures and grounding your nervous system.',
    gemini: 'Multi-tasking comes naturally but focus is scattered. Good for writing, calls, and short projects.',
    cancer: 'Family and home matters call. Nostalgia is strong and emotional needs are louder than usual.',
    leo: 'Self-expression peaks. Perform, create, and connect — your magnetism is high.',
    virgo: 'Attention to detail is sharp. Organize, plan, and tend to health routines.',
    libra: 'Diplomacy and charm are high. Ideal for negotiations, dates, and collaborative decisions.',
    scorpio: 'Depth and intensity define the mood. Avoid power struggles but use this for deep work.',
    sagittarius: 'Philosophy and adventure call. Great for travel, study, or having big-picture conversations.',
    capricorn: 'Serious and goal-oriented. Use this energy for career tasks and long-term planning.',
    aquarius: 'Unconventional ideas emerge. Great for group work, tech, and thinking outside the box.',
    pisces: 'Highly intuitive and dreamy. Rest, create art, and trust your gut over logic today.',
  }
  return map[sign] ?? map['libra']
}

function getMoonInSignTips(sign: string): string[] {
  const map: Record<string, string[]> = {
    aries: ['Lead with confidence, not aggression', 'Channel fire into creative projects', 'Ground yourself before reacting'],
    taurus: ['Enjoy a good meal or walk in nature', 'Avoid impulsive financial decisions', 'Connect with your senses'],
    gemini: ['Write down your ideas — your mind is sharp', 'Reach out to people you have been meaning to contact', 'Avoid information overload'],
    cancer: ['Call a loved one', 'Cook something nourishing', 'Create a safe cozy space at home'],
    leo: ['Express yourself boldly', 'Dress up and own the room', 'Share your passion openly'],
    virgo: ['Tackle the task you have been avoiding', 'Organize your workspace', 'Practice body-mind wellness'],
    libra: ['Resolve tensions with grace', 'Schedule a date or social event', 'Seek balance in all decisions'],
    scorpio: ['Trust your intuition completely', 'Do inner shadow work', 'Guard your energy carefully'],
    sagittarius: ['Explore a new idea or place', 'Be honest but consider delivery', 'Stay optimistic about outcomes'],
    capricorn: ['Focus on your most ambitious goal', 'Skip distractions, work with discipline', 'Acknowledge small wins'],
    aquarius: ['Brainstorm unconventional solutions', 'Connect with a community or cause', 'Detach from drama'],
    pisces: ['Meditate or journal in the morning', 'Trust dreams and inner signs', 'Protect your energy in crowds'],
  }
  return map[sign] ?? map['libra']
}

export function MoonCardStrip() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const cards = useMoonCards()

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
        borderColor="rgba(231,196,79,0.86)"
        imageClassName="object-cover object-center scale-[0.95]"
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
