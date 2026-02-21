import { cn } from '@/lib/utils'

type BadgeVariant = 'pro' | 'now' | 'gold' | 'cyan' | 'lime' | 'rose' | 'muted' | 'online'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  pro:    'bg-gold-accent/20 text-gold-accent border border-gold-accent/30 font-bold tracking-wider',
  now:    'bg-gold-accent text-midnight-950 font-bold',
  gold:   'bg-gold-accent/15 text-gold-accent border border-gold-accent/25',
  cyan:   'bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/25',
  lime:   'bg-lime-accent/15 text-lime-accent border border-lime-accent/25',
  rose:   'bg-rose-accent/15 text-rose-accent border border-rose-accent/25',
  muted:  'bg-white/8 text-text-secondary border border-white/10',
  online: 'bg-lime-accent text-midnight-950 font-semibold',
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5',
        'text-[10px] font-medium leading-none uppercase tracking-wide',
        variantMap[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
