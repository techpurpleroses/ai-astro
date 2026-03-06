import type { AdvisorReportDetail, AdvisorReportProduct } from '@/types'

export const REPORT_PRODUCTS: AdvisorReportProduct[] = [
  {
    id: 'astrocartography-report',
    title: 'Astrocartography Report',
    teaser: 'Where your energy is strongest across the world.',
    price: 9.99,
    status: 'buy',
    icon: '/assets/features/horoscope.png',
    accent: '#84CC16',
  },
  {
    id: 'moon-report',
    title: 'Moon Report',
    teaser: 'How moon cycles affect your emotions and momentum.',
    price: 9.99,
    status: 'buy',
    icon: '/assets/features/moon.png',
    accent: '#84CC16',
  },
  {
    id: 'compatibility-report',
    title: 'Compatibility Report',
    teaser: 'Deep relationship patterns and practical guidance.',
    price: 19.99,
    status: 'buy',
    icon: '/assets/features/compatibility.png',
    accent: '#84CC16',
  },
  {
    id: 'birth-chart-report',
    title: 'Birth Chart Report',
    teaser: 'A full reading of your natal placements.',
    price: 19.99,
    status: 'buy',
    icon: '/assets/features/birth-chart.png',
    accent: '#84CC16',
  },
  {
    id: 'soulmate-sketch',
    title: 'Soulmate Sketch',
    teaser: 'Visual and emotional profile of your soulmate.',
    status: 'owned',
    badge: 'Gift',
    icon: '/assets/features/compatibility.png',
    accent: '#22D3EE',
  },
  {
    id: 'prediction-2026-report',
    title: 'Prediction 2026 Report',
    teaser: 'Month-by-month forecast for love, money, and growth.',
    status: 'owned',
    badge: 'Gift',
    icon: '/assets/features/moon.png',
    accent: '#22D3EE',
  },
]

export const SETTINGS_BENEFITS: string[] = [
  'Personal Horoscopes',
  'Compatibility Report',
  'Your Birth Chart',
  'Palm Reading',
  'Daily Tips',
  'Tarot Readings',
]

export const REPORT_DETAILS: Record<string, AdvisorReportDetail> = {
  'astrocartography-report': {
    id: 'astrocartography-report',
    title: 'Astrocartography Report',
    subtitle: 'Find the places that amplify your chart.',
    stats: [
      { label: 'Best City', value: 'Lisbon' },
      { label: 'Career Line', value: 'Sun MC' },
      { label: 'Love Line', value: 'Venus DSC' },
    ],
    sections: [
      {
        title: 'Quick Insight',
        body: 'You thrive near coastal cities where your communication and public visibility lines intersect.',
        bullets: ['Strong career lift in west-facing cities', 'Faster social growth near water'],
      },
      {
        title: 'Travel Windows',
        body: 'The next 90 days favor short trips for networking, negotiation, and visibility.',
      },
      {
        title: 'Action',
        body: 'Test one location for 30 days and track mood, output, and relationship quality.',
      },
    ],
  },
  'moon-report': {
    id: 'moon-report',
    title: 'Moon Report',
    subtitle: 'Emotional timing guide by moon phases.',
    stats: [
      { label: 'Current Phase', value: 'Waxing Crescent' },
      { label: 'Peak Energy', value: 'Full Moon' },
      { label: 'Reset Day', value: 'New Moon' },
    ],
    sections: [
      {
        title: 'Moon Pattern',
        body: 'Your chart responds strongly to waxing phases. Start plans early and refine before the full moon.',
      },
      {
        title: 'Do',
        body: 'Take decisive action on growth tasks and relationship conversations in waxing cycles.',
      },
      {
        title: 'Avoid',
        body: 'Do not force closure in waning phases. Use them for cleanup and recovery.',
      },
    ],
  },
  'compatibility-report': {
    id: 'compatibility-report',
    title: 'Compatibility Report',
    subtitle: 'How your dynamic works in real life.',
    stats: [
      { label: 'Overall', value: '78%' },
      { label: 'Communication', value: '84%' },
      { label: 'Chemistry', value: '73%' },
    ],
    sections: [
      {
        title: 'Dynamic',
        body: 'Strong attraction with different emotional pacing. Shared goals keep this stable long-term.',
      },
      {
        title: 'Strengths',
        body: 'Great teamwork and practical planning when goals are clearly defined.',
      },
      {
        title: 'Challenges',
        body: 'Misunderstandings happen when one side needs speed and the other needs certainty.',
      },
    ],
  },
  'birth-chart-report': {
    id: 'birth-chart-report',
    title: 'Birth Chart Report',
    subtitle: 'Your natal blueprint in one place.',
    stats: [
      { label: 'Sun', value: 'Capricorn' },
      { label: 'Moon', value: 'Scorpio' },
      { label: 'Rising', value: 'Cancer' },
    ],
    sections: [
      {
        title: 'Core Pattern',
        body: 'Structured ambition plus emotional intensity. You build steadily but feel deeply.',
      },
      {
        title: 'Focus',
        body: 'Use routines for output and private reflection for emotional reset.',
      },
      {
        title: 'Growth Edge',
        body: 'Balance control with trust in collaborative environments.',
      },
    ],
  },
  'soulmate-sketch': {
    id: 'soulmate-sketch',
    title: 'Your Soulmate',
    subtitle: 'Generated from your birth chart signature.',
    stats: [
      { label: 'Sun Match', value: 'Capricorn' },
      { label: 'Moon Match', value: 'Pisces' },
      { label: 'Rising Match', value: 'Libra' },
    ],
    sections: [
      {
        title: 'Why You Match',
        body: 'A grounding partner with calm emotional intelligence and high loyalty patterns.',
      },
      {
        title: 'Chemistry',
        body: 'Strong long-term resonance with balanced passion and practical planning.',
      },
      {
        title: 'Timing',
        body: 'Best meeting window appears in the next Jupiter relationship transit cycle.',
      },
    ],
  },
  'prediction-2026-report': {
    id: 'prediction-2026-report',
    title: 'Prediction 2026 Report',
    subtitle: 'Your year map for money, love, and momentum.',
    stats: [
      { label: 'Power Month', value: 'August' },
      { label: 'Love Peak', value: 'October' },
      { label: 'Career Peak', value: 'June' },
    ],
    sections: [
      {
        title: 'Year Theme',
        body: 'Expansion through disciplined execution. Consistency outperforms intensity this year.',
      },
      {
        title: 'Career',
        body: 'A promotion or visibility jump is likely when you prioritize one flagship project.',
      },
      {
        title: 'Relationships',
        body: 'The strongest progress comes from honest expectations and slower commitment pacing.',
      },
      {
        title: 'Final Note',
        body: 'Treat 2026 as a positioning year: build systems, strengthen alliances, and compound wins.',
      },
    ],
  },
}
