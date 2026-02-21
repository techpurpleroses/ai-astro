'use client'

import Image from 'next/image'

const SIGNS = [
  { name: 'Aries',       color: '#EF4444' },
  { name: 'Taurus',      color: '#84CC16' },
  { name: 'Gemini',      color: '#F59E0B' },
  { name: 'Cancer',      color: '#06B6D4' },
  { name: 'Leo',         color: '#F59E0B' },
  { name: 'Virgo',       color: '#84CC16' },
  { name: 'Libra',       color: '#A78BFA' },
  { name: 'Scorpio',     color: '#06B6D4' },
  { name: 'Sagittarius', color: '#EF4444' },
  { name: 'Capricorn',   color: '#78716C' },
  { name: 'Aquarius',    color: '#F59E0B' },
  { name: 'Pisces',      color: '#6366F1' },
]

interface ZodiacGridProps {
  selected?: string | null
  onSelect: (sign: string) => void
}

export function ZodiacGrid({ selected, onSelect }: ZodiacGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2 p-1">
      {SIGNS.map((sign) => {
        const isSelected = selected?.toLowerCase() === sign.name.toLowerCase()
        const slug = sign.name.toLowerCase()
        return (
          <button
            key={sign.name}
            onClick={() => onSelect(sign.name)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
            style={{
              background: isSelected ? `${sign.color}20` : 'rgba(255,255,255,0.03)',
              border: isSelected ? `1px solid ${sign.color}50` : '1px solid rgba(255,255,255,0.06)',
              boxShadow: isSelected ? `0 0 14px ${sign.color}25` : undefined,
            }}
          >
            {/* Zodiac image */}
            <div
              className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: isSelected ? `${sign.color}18` : 'rgba(255,255,255,0.05)',
                border: isSelected ? `1px solid ${sign.color}35` : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Image
                src={`/zodiac/${slug}.png`}
                alt={sign.name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>

            <span
              className="text-[9px] font-display font-semibold leading-tight text-center"
              style={{ color: isSelected ? sign.color : '#4E6179' }}
            >
              {sign.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
