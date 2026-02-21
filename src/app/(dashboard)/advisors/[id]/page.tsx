import { ChatPageClient } from '@/components/advisors/chat/chat-page'

export default function AdvisorChatPage({ params }: { params: { id: string } }) {
  return <ChatPageClient advisorId={params.id} />
}
