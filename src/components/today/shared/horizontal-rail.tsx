'use client'

import { cn } from '@/lib/utils'

interface HorizontalRailProps {
  children: React.ReactNode
  className?: string
  trackClassName?: string
}

export function HorizontalRail({
  children,
  className,
  trackClassName,
}: HorizontalRailProps) {
  return (
    <div
      data-no-nav-swipe="true"
      className={cn('overflow-x-auto px-4 pt-1 pb-2 scrollbar-hide', className)}
    >
      <div className={cn('flex gap-3 pr-2', trackClassName)}>{children}</div>
    </div>
  )
}
