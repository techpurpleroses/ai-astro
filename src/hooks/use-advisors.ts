import { useQuery } from '@tanstack/react-query'
import { astroFetch, astroFetchJson } from '@/lib/client/astro-fetch'
import type { Advisor, ChatMessage } from '@/types'

export interface ChatHistoryResponse {
  session: { id: string; status: string; startedAt: string; advisorSlug: string } | null
  messages: ChatMessage[]
}

export function useAdvisors() {
  return useQuery<{ advisors: Advisor[]; recentChats: string[] }>({
    queryKey: ['advisors'],
    queryFn: async () => {
      const data = await astroFetchJson<{
        advisors: Array<Advisor & { avatarUrl?: string | null }>
        recentChats?: string[]
      }>(
        '/api/dashboard/advisors',
        { debugOrigin: 'hooks.use-advisors.list' }
      )
      return {
        advisors: (data.advisors ?? []).map((a) => ({ ...a, avatar: a.avatarUrl ?? undefined })),
        recentChats: data.recentChats ?? [],
      }
    },
    // 30s keeps online status reasonably fresh without hammering the server
    staleTime: 30 * 1000,
  })
}

export function useAdvisor(id: string) {
  const { data } = useAdvisors()
  return data?.advisors.find((a) => a.id === id) ?? null
}

export function useChatMessages(advisorSlug: string) {
  return useQuery<ChatHistoryResponse>({
    queryKey: ['chat', advisorSlug],
    queryFn: async () => {
      return astroFetchJson<ChatHistoryResponse>(`/api/dashboard/advisors/${advisorSlug}/messages`, {
        debugOrigin: 'hooks.use-advisors.chat-history',
      })
    },
    staleTime: 0,
  })
}

export function useSuggestedQuestions() {
  return useQuery<string[]>({
    queryKey: ['suggested-questions'],
    queryFn: async () => {
      const res = await astroFetch('/api/dashboard/features/magic-ball', {
        debugOrigin: 'hooks.use-advisors.suggested-questions',
      })
      if (!res.ok) return []
      const data = await res.json() as { suggestedQuestions?: string[] }
      return data.suggestedQuestions ?? []
    },
    staleTime: Infinity,
  })
}
