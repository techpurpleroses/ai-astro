import { Suspense } from 'react'
import { BirthChartClient } from '@/components/birth-chart/birth-chart-page'
import { SkeletonCard } from '@/components/ui/skeleton'

function BirthChartFallback() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <SkeletonCard className="h-12 rounded-full" />
      <SkeletonCard className="h-80 rounded-3xl" />
      <SkeletonCard className="h-36" />
      <SkeletonCard className="h-48" />
    </div>
  )
}

export default function BirthChartPage() {
  return (
    <Suspense fallback={<BirthChartFallback />}>
      <BirthChartClient />
    </Suspense>
  )
}
