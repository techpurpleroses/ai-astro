import type { StoryArticle, StoryCategory } from '@/types'

export const STORY_CATEGORIES: StoryCategory[] = [
  { id: 'affirmations', title: 'Affirmations', subtitle: 'Daily mindset resets', accent: '#22D3EE', image: '/assets/moon-report.webp' },
  { id: 'archetypes', title: 'Archetypes', subtitle: 'Cosmic personality modes', accent: '#F59E0B', image: '/assets/compatibility-report.png' },
  { id: 'birth-chart', title: 'Birth Chart', subtitle: 'Chart basics in plain words', accent: '#84CC16', image: '/assets/birth-chart-report.png' },
  { id: 'capricorn', title: 'Capricorn', subtitle: 'Sign deep dive', accent: '#EAB308', image: '/assets/zodiac/capricorn.png' },
  { id: 'cartography', title: 'Cartography', subtitle: 'Location and destiny lines', accent: '#22D3EE', image: '/assets/astrocartography.png' },
  { id: 'crystals', title: 'Crystals', subtitle: 'Stones by intention', accent: '#A78BFA', image: '/assets/magic-ball.png' },
  { id: 'easy-astro', title: 'Easy Astro', subtitle: 'Quick astrology explainers', accent: '#06B6D4', image: '/assets/features/horoscope.png' },
  { id: 'full-moons', title: 'Full Moons', subtitle: 'Release and visibility cycles', accent: '#F59E0B', image: '/assets/moon/full-moon.webp' },
  { id: 'good-vibes', title: 'Good Vibes', subtitle: 'Energy rituals and habits', accent: '#84CC16', image: '/assets/moon/moon-icon.png' },
  { id: 'human-design', title: 'Human Design', subtitle: 'Type and strategy basics', accent: '#22D3EE', image: '/assets/features/compatibility.png' },
  { id: 'mindset', title: 'Mindset', subtitle: 'Mental clarity and focus', accent: '#F43F5E', image: '/assets/features/magic-ball.png' },
  { id: 'moon-phases', title: 'Moon Phases', subtitle: 'What each phase is for', accent: '#EAB308', image: '/assets/moon/moon-phase-bg.webp' },
  { id: 'new-moons', title: 'New Moons', subtitle: 'Intention-setting timing', accent: '#84CC16', image: '/assets/moon/new-moon.webp' },
  { id: 'retrogrades', title: 'Retrogrades', subtitle: 'How to use slowdown cycles', accent: '#F97316', image: '/assets/features/moon.png' },
  { id: 'rituals', title: 'Rituals', subtitle: 'Simple repeatable practices', accent: '#22D3EE', image: '/assets/moon/moon-rituals.webp' },
  { id: 'wisdom', title: 'Wisdom', subtitle: 'Timeless cosmic principles', accent: '#F59E0B', image: '/assets/features/tarot-cards.webp' },
]

function article(title: string, subtitle: string, accent: string): StoryArticle {
  return {
    title,
    subtitle,
    accent,
    sections: [
      {
        heading: 'Core Idea',
        body: 'This short lesson gives you the key concept and how to apply it in day-to-day decisions.',
      },
      {
        heading: 'How To Use It',
        body: 'Pick one action for today, repeat it for 7 days, and track mood, confidence, and output.',
        bullets: ['Keep it simple', 'Use one measurable habit', 'Review weekly'],
      },
      {
        heading: 'Quick Reminder',
        body: 'Progress compounds when your rituals are realistic enough to be repeated consistently.',
      },
    ],
  }
}

export const STORY_ARTICLES: Record<string, StoryArticle> = {
  affirmations: article('Daily Affirmations', 'Language that calibrates your mindset.', '#22D3EE'),
  archetypes: article('What Are The Archetypes?', 'Your recurring personality patterns.', '#F59E0B'),
  'birth-chart': article('Birth Chart Basics', 'Understand signs, planets, and houses fast.', '#84CC16'),
  capricorn: article('Capricorn Energy', 'Discipline, long-term growth, and standards.', '#EAB308'),
  cartography: article('Astrocartography Intro', 'Map locations that amplify your chart.', '#22D3EE'),
  crystals: article('Crystal Guide', 'Match stones to emotional and work intentions.', '#A78BFA'),
  'easy-astro': article('Easy Astrology', 'The practical way to read daily astrology.', '#06B6D4'),
  'full-moons': article('Full Moon Playbook', 'Close loops, release pressure, and reflect.', '#F59E0B'),
  'good-vibes': article('Good Vibes Practice', 'Simple ways to stabilize your energy.', '#84CC16'),
  'human-design': article('Human Design Starter', 'Use type and strategy in routine choices.', '#22D3EE'),
  mindset: article('Mindset Reset', 'Reframe stress into focused action.', '#F43F5E'),
  'moon-phases': article('Moon Phase Guide', 'Use each phase for the right kind of task.', '#EAB308'),
  'new-moons': article('New Moon Intentions', 'Set cleaner goals with a smaller scope.', '#84CC16'),
  retrogrades: article('Retrograde Guide', 'Slow down, revise, and recover momentum.', '#F97316'),
  rituals: article('Rituals That Stick', 'Tiny structures that reduce decision fatigue.', '#22D3EE'),
  wisdom: article('Cosmic Wisdom Notes', 'Principles you can apply across seasons.', '#F59E0B'),
}
