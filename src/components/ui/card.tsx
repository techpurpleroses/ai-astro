import { cn } from '@/lib/utils'

type GlowColor = 'cyan' | 'gold' | 'lime' | 'rose' | 'violet' | 'none'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: GlowColor
  padding?: Padding
  interactive?: boolean
  onClick?: () => void
  as?: 'div' | 'button' | 'article' | 'section'
}

const glowMap: Record<GlowColor, string> = {
  cyan:   'glow-cyan',
  gold:   'glow-gold',
  lime:   'glow-lime',
  rose:   'glow-rose',
  violet: 'shadow-[0_0_20px_rgba(167,139,250,0.3)]',
  none:   '',
}

const padMap: Record<Padding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-5',
}

export function GlassCard({
  children,
  className,
  glowColor = 'none',
  padding = 'md',
  interactive = false,
  onClick,
  as,
}: GlassCardProps) {
  const Tag = (as ?? 'div') as React.ElementType
  return (
    <Tag
      className={cn(
        'rounded-2xl',
        interactive ? 'glass-card-interactive cursor-pointer' : 'glass-card',
        glowMap[glowColor],
        padMap[padding],
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
