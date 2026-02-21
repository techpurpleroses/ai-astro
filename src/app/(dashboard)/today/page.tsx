import { Suspense } from 'react'
import { TodayClient } from '@/components/today/today-page'
import { SkeletonCard } from '@/components/ui/skeleton'

function TodayFallback() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <SkeletonCard className="h-12 rounded-full" />
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-36" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>
    </div>
  )
}

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayFallback />}>
      <TodayClient />
    </Suspense>
  )
}
