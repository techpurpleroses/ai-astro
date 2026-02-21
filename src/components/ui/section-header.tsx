import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  onSeeAll?: () => void
  seeAllLabel?: string
  className?: string
}

export function SectionHeader({
  title,
  onSeeAll,
  seeAllLabel = 'See all',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <h2 className="font-display text-base font-semibold text-text-primary">
        {title}
      </h2>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-sm font-medium text-cyan-glow transition-opacity active:opacity-70"
          aria-label={`${seeAllLabel} for ${title}`}
        >
          {seeAllLabel}
          <ChevronRight size={14} className="mt-px" />
        </button>
      )}
    </div>
  )
}
