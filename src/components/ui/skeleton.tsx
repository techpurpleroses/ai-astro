import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  rounded?: string
}

export function Skeleton({ className, rounded = 'rounded-lg' }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', rounded, className)}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card rounded-2xl p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-10 w-full rounded-full mt-2" />
    </div>
  )
}
