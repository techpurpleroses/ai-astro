import { cn } from '@/lib/utils'
import { ZODIAC_GLYPHS, ZODIAC_NAMES, ELEMENT_COLORS, ZODIAC_ELEMENTS } from '@/lib/constants'
import type { ZodiacSign } from '@/lib/constants'

interface ZodiacIconProps {
  sign: ZodiacSign
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showName?: boolean
  className?: string
}

const sizeMap = {
  sm: { container: 'h-8 w-8 text-sm',  text: 'text-[10px]' },
  md: { container: 'h-10 w-10 text-base', text: 'text-xs' },
  lg: { container: 'h-14 w-14 text-2xl', text: 'text-xs' },
  xl: { container: 'h-20 w-20 text-4xl', text: 'text-sm' },
}

export function ZodiacIcon({ sign, size = 'md', showName = false, className }: ZodiacIconProps) {
  const elementColor = ELEMENT_COLORS[ZODIAC_ELEMENTS[sign]]

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          'border border-white/10',
          sizeMap[size].container,
        )}
        style={{
          background: `radial-gradient(circle, ${elementColor}22 0%, ${elementColor}08 100%)`,
          boxShadow: `0 0 12px ${elementColor}30`,
        }}
      >
        <span style={{ color: elementColor }}>{ZODIAC_GLYPHS[sign]}</span>
      </div>
      {showName && (
        <span className={cn('font-display font-medium text-text-secondary', sizeMap[size].text)}>
          {ZODIAC_NAMES[sign]}
        </span>
      )}
    </div>
  )
}
