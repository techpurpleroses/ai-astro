export const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const

export type ZodiacSign = typeof ZODIAC_SIGNS[number]

export const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  aries:       '♈',
  taurus:      '♉',
  gemini:      '♊',
  cancer:      '♋',
  leo:         '♌',
  virgo:       '♍',
  libra:       '♎',
  scorpio:     '♏',
  sagittarius: '♐',
  capricorn:   '♑',
  aquarius:    '♒',
  pisces:      '♓',
}

export const ZODIAC_NAMES: Record<ZodiacSign, string> = {
  aries:       'Aries',
  taurus:      'Taurus',
  gemini:      'Gemini',
  cancer:      'Cancer',
  leo:         'Leo',
  virgo:       'Virgo',
  libra:       'Libra',
  scorpio:     'Scorpio',
  sagittarius: 'Sagittarius',
  capricorn:   'Capricorn',
  aquarius:    'Aquarius',
  pisces:      'Pisces',
}

export const ZODIAC_DATES: Record<ZodiacSign, string> = {
  aries:       'Mar 21 – Apr 19',
  taurus:      'Apr 20 – May 20',
  gemini:      'May 21 – Jun 20',
  cancer:      'Jun 21 – Jul 22',
  leo:         'Jul 23 – Aug 22',
  virgo:       'Aug 23 – Sep 22',
  libra:       'Sep 23 – Oct 22',
  scorpio:     'Oct 23 – Nov 21',
  sagittarius: 'Nov 22 – Dec 21',
  capricorn:   'Dec 22 – Jan 19',
  aquarius:    'Jan 20 – Feb 18',
  pisces:      'Feb 19 – Mar 20',
}

export const ZODIAC_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries:       'fire',
  taurus:      'earth',
  gemini:      'air',
  cancer:      'water',
  leo:         'fire',
  virgo:       'earth',
  libra:       'air',
  scorpio:     'water',
  sagittarius: 'fire',
  capricorn:   'earth',
  aquarius:    'air',
  pisces:      'water',
}

export const ELEMENT_COLORS: Record<'fire' | 'earth' | 'air' | 'water', string> = {
  fire:  '#EF4444',
  earth: '#84CC16',
  air:   '#06B6D4',
  water: '#6366F1',
}

export const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const

export type Planet = typeof PLANETS[number]

export const PLANET_GLYPHS: Record<string, string> = {
  Sun:        '☉',
  Moon:       '☽',
  Mercury:    '☿',
  Venus:      '♀',
  Mars:       '♂',
  Jupiter:    '♃',
  Saturn:     '♄',
  Uranus:     '♅',
  Neptune:    '♆',
  Pluto:      '♇',
  Ascendant:  'Asc',
  Midheaven:  'MC',
  'North Node': '☊',
  Chiron:     '⚷',
}

export const PLANET_COLORS: Record<string, string> = {
  Sun:        '#F59E0B',
  Moon:       '#94A3B8',
  Mercury:    '#06B6D4',
  Venus:      '#F43F5E',
  Mars:       '#EF4444',
  Jupiter:    '#A78BFA',
  Saturn:     '#78716C',
  Uranus:     '#14B8A6',
  Neptune:    '#6366F1',
  Pluto:      '#7C3AED',
  Ascendant:  '#22C55E',
  Midheaven:  '#F97316',
}

export const ASPECT_COLORS: Record<string, string> = {
  conjunction: 'rgba(245,158,11,0.7)',
  opposition:  'rgba(239,68,68,0.6)',
  trine:       'rgba(34,197,94,0.6)',
  square:      'rgba(239,68,68,0.5)',
  sextile:     'rgba(6,182,212,0.6)',
  quincunx:    'rgba(148,163,184,0.4)',
}

export const DEFAULT_SIGN: ZodiacSign = 'scorpio'
