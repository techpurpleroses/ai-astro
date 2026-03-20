import { ChatPageClient } from '@/components/advisors/chat/chat-page'

export default async function AdvisorChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChatPageClient advisorId={id} />
}
