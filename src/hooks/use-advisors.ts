import { useQuery } from '@tanstack/react-query'
import type { Advisor, ChatMessage } from '@/types'

export function useAdvisors() {
  return useQuery<{ advisors: Advisor[]; recentChats: string[] }>({
    queryKey: ['advisors'],
    queryFn: async () => {
      const data = await import('@/data/advisors.json')
      return data as unknown as { advisors: Advisor[]; recentChats: string[] }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdvisor(id: string) {
  const { data } = useAdvisors()
  return data?.advisors.find((a) => a.id === id) ?? null
}

export function useChatMessages(advisorId: string) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chat', advisorId],
    queryFn: async () => {
      const data = await import('@/data/chat-messages.json')
      const threads = data.threads as unknown as Record<string, ChatMessage[]>
      return threads[advisorId] ?? []
    },
    staleTime: Infinity,
  })
}

export function useSuggestedQuestions() {
  return useQuery<string[]>({
    queryKey: ['suggested-questions'],
    queryFn: async () => {
      const data = await import('@/data/chat-messages.json')
      return data.suggestedQuestions
    },
    staleTime: Infinity,
  })
}
