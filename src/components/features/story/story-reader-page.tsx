'use client'

import { useRouter } from 'next/navigation'
import { useStoryCategories } from '@/hooks/use-stories'
import { StoryViewer } from './story-viewer'

interface StoryReaderClientProps {
  slug: string
}

export function StoryReaderClient({ slug }: StoryReaderClientProps) {
  const router = useRouter()
  const { data: storiesData } = useStoryCategories()
  const categories = storiesData ?? []

  const startIndex = Math.max(0, categories.findIndex(c => c.id === slug))

  return (
    <StoryViewer
      categories={categories}
      startIndex={startIndex}
      onClose={() => router.back()}
    />
  )
}
