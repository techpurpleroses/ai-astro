import { Suspense } from 'react'
import { AdvisorsClient } from '@/components/advisors/advisors-page'
import { SkeletonCard } from '@/components/ui/skeleton'

function AdvisorsFallback() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <SkeletonCard className="h-24 rounded-3xl" />
      <SkeletonCard className="h-12 rounded-full" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-28" />)}
      </div>
    </div>
  )
}

export default function AdvisorsPage() {
  return (
    <Suspense fallback={<AdvisorsFallback />}>
      <AdvisorsClient />
    </Suspense>
  )
}
