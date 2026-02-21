import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  isOnline?: boolean
  className?: string
}

const sizeMap = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
}

const dotSizeMap = {
  sm: 'h-2 w-2 -right-0.5 -bottom-0.5',
  md: 'h-2.5 w-2.5 right-0 bottom-0',
  lg: 'h-3 w-3 right-0.5 bottom-0.5',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function getColorFromName(name: string): string {
  const colors = [
    'linear-gradient(135deg, #06B6D4, #6366F1)',
    'linear-gradient(135deg, #F59E0B, #EF4444)',
    'linear-gradient(135deg, #84CC16, #06B6D4)',
    'linear-gradient(135deg, #A78BFA, #F43F5E)',
    'linear-gradient(135deg, #14B8A6, #6366F1)',
    'linear-gradient(135deg, #F97316, #F59E0B)',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ src, name, size = 'md', isOnline, className }: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden',
          'border-2 border-white/10',
          sizeMap[size],
        )}
        style={!src ? { background: getColorFromName(name) } : undefined}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display font-semibold text-white">
            {getInitials(name)}
          </span>
        )}
      </div>

      {isOnline !== undefined && (
        <div
          className={cn(
            'absolute rounded-full border-2 border-midnight-900',
            dotSizeMap[size],
            isOnline ? 'bg-lime-accent' : 'bg-text-muted',
          )}
        />
      )}
    </div>
  )
}
