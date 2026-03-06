import { StoryReaderClient } from '@/components/features/story/story-reader-page'

export default async function StoryReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <StoryReaderClient slug={slug} />
}
