import { Suspense } from 'react'
import { CompatibilityClient } from '@/components/compatibility/compatibility-page'
import { SkeletonCard } from '@/components/ui/skeleton'

function CompatibilityFallback() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <SkeletonCard className="h-24 rounded-3xl" />
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-36" />
    </div>
  )
}

export default function CompatibilityPage() {
  return (
    <Suspense fallback={<CompatibilityFallback />}>
      <CompatibilityClient />
    </Suspense>
  )
}
