'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, Send, Mic, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useAdvisor, useChatMessages, useSuggestedQuestions } from '@/hooks/use-advisors'
import { usePlan } from '@/hooks/use-plan'
import { astroFetch } from '@/lib/client/astro-fetch'
import type { ChatMessage, TarotCard } from '@/types'

function SessionTimer({ isOnline }: { isOnline: boolean }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isOnline) return
    const id = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(id)
  }, [isOnline])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-1.5 bg-gold-accent/10 border border-gold-accent/25 px-3 py-1 rounded-full">
      <div className="h-1.5 w-1.5 rounded-full bg-gold-accent animate-pulse" />
      <span className="text-[10px] font-display font-bold text-gold-accent tabular-nums">{mm}:{ss}</span>
    </div>
  )
}

function InlineTarotCard({ card }: { card: TarotCard }) {
  return (
    <div
      className="mt-2 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-400/20">
        <span className="text-violet-400 text-sm">*</span>
        <span className="text-[10px] font-display font-semibold text-violet-400 uppercase tracking-widest">
          Tarot Reading
        </span>
      </div>
      <div className="p-3">
        <p className="font-display text-sm font-bold text-text-primary">{card.name}</p>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{card.uprightMeaning}</p>
        <p className="text-[10px] text-text-muted mt-1.5 italic">{card.tipOfDay}</p>
      </div>
    </div>
  )
}

function MessageBubble({ message, advisorName }: { message: ChatMessage; advisorName: string }) {
  const isAdvisor = message.role === 'advisor'
  const time = format(new Date(message.timestamp), 'h:mm a')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2 ${isAdvisor ? 'items-start' : 'items-start flex-row-reverse'}`}
    >
      {isAdvisor && (
        <div
          className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-display font-bold"
          style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(167,139,250,0.15))' }}
        >
          {advisorName.split(' ').map((part) => part[0]).join('')}
        </div>
      )}

      <div className="max-w-[78%]">
        <div
          className="px-3 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={isAdvisor ? {
            background: 'rgba(15,30,53,0.9)',
            border: '1px solid rgba(6,182,212,0.15)',
            color: '#CBD5E1',
            borderRadius: '4px 18px 18px 18px',
          } : {
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.12))',
            border: '1px solid rgba(6,182,212,0.25)',
            color: '#F8FAFC',
            borderRadius: '18px 4px 18px 18px',
          }}
        >
          {message.content}
          {message.tarotCard && <InlineTarotCard card={message.tarotCard} />}
        </div>
        <p className={`text-[9px] text-text-muted mt-1 ${isAdvisor ? '' : 'text-right'}`}>{time}</p>
      </div>
    </motion.div>
  )
}

function TypingIndicator({ advisorName }: { advisorName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 items-start"
    >
      <div
        className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-display font-bold"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(167,139,250,0.15))' }}
      >
        {advisorName.split(' ').map((part) => part[0]).join('')}
      </div>
      <div
        className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
        style={{
          background: 'rgba(15,30,53,0.9)',
          border: '1px solid rgba(6,182,212,0.15)',
          borderRadius: '4px 18px 18px 18px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-text-muted"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export function ChatPageClient({ advisorId }: { advisorId: string }) {
  const router = useRouter()
  const advisor = useAdvisor(advisorId)
  const { data: chatHistory, isLoading } = useChatMessages(advisorId)
  const { data: suggested } = useSuggestedQuestions()

  const { creditBalance } = usePlan()
  const [input, setInput] = useState('')
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [refillOpen, setRefillOpen] = useState(false)
  const [billingIssueOpen, setBillingIssueOpen] = useState(false)

  const hasCredits = creditBalance > 0

  // Track session ID across sends — first send creates session, subsequent sends reuse it
  const sessionIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (chatHistory?.session?.id) {
      sessionIdRef.current = chatHistory.session.id
    }
  }, [chatHistory?.session?.id])

  const bottomRef = useRef<HTMLDivElement>(null)
  const serverMessages = chatHistory?.messages ?? []
  const mergedMessages = useMemo(
    () => [...serverMessages, ...pendingMessages],
    [serverMessages, pendingMessages],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mergedMessages, isSending])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return

    // Optimistically add user message
    const optimisticMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      advisorId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setPendingMessages((prev) => [...prev, optimisticMsg])
    setInput('')
    setIsSending(true)

    try {
      const res = await astroFetch(`/api/dashboard/advisors/${advisorId}/messages`, {
        debugOrigin: 'components.advisors.chat.send-message',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          sessionId: sessionIdRef.current,
        }),
      })

      if (res.ok) {
        const result = await res.json() as {
          session: { id: string }
          userMessage: ChatMessage
          advisorMessage: ChatMessage
        }
        // Save session ID for subsequent messages
        sessionIdRef.current = result.session.id
        // Replace optimistic message with real messages from server
        setPendingMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id)
          return [...withoutOptimistic, result.userMessage, result.advisorMessage]
        })
      }
    } catch {
      // Keep optimistic message visible; user can retry
    } finally {
      setIsSending(false)
    }
  }, [advisorId, isSending])

  if (!advisor) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <SkeletonCard className="h-24 w-72" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-white/5"
        style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(16px)' }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6 active:bg-white/10"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-sm font-bold text-text-primary">{advisor.name}</p>
            {advisor.isOnline && <div className="h-1.5 w-1.5 rounded-full bg-lime-accent" />}
          </div>
          <div className="flex items-center gap-1.5">
            <Star size={9} className="text-gold-accent fill-gold-accent" />
            <span className="text-[9px] text-text-muted">{advisor.rating} - {advisor.specialty}</span>
          </div>
        </div>

        {advisor.isOnline && <SessionTimer isOnline={advisor.isOnline} />}
      </div>

      <div
        className="shrink-0 flex items-center gap-2 px-4 py-2 text-center justify-center"
        style={{ background: 'rgba(6,182,212,0.05)', borderBottom: '1px solid rgba(6,182,212,0.08)' }}
      >
        <Lock size={9} className="text-text-muted" />
        <p className="text-[9px] text-text-muted">All sessions are private and confidential</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <SkeletonCard key={item} className="h-16" />)}
          </div>
        )}

        {mergedMessages.map((message) => (
          <MessageBubble key={message.id} message={message} advisorName={advisor.name} />
        ))}

        {isSending && <TypingIndicator advisorName={advisor.name} />}

        {mergedMessages.length === 0 && !isLoading && suggested && (
          <div className="pt-2">
            <p className="text-[10px] text-text-muted mb-2 font-display">Suggested questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.slice(0, 3).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(question)}
                  className="text-[10px] text-cyan-glow bg-cyan-glow/8 border border-cyan-glow/20 px-3 py-1.5 rounded-full font-display transition-all active:scale-95"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        className="shrink-0 px-4 py-3 border-t border-white/5"
        style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(16px)' }}
      >
        {!hasCredits ? (
          /* No credits — show Buy Credits CTA instead of send input */
          <div className="space-y-2">
            <p className="text-xs text-text-muted text-center">
              You have <span className="text-amber-300 font-bold">0 credits</span> remaining.
            </p>
            <button
              onClick={() => router.push('/billing')}
              className="w-full rounded-xl py-3 text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0a1628' }}
            >
              Buy Credits to Continue
            </button>
          </div>
        ) : (
          <div
            className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{ background: 'rgba(15,30,53,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend(input)
                }
              }}
              placeholder="Ask your question..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none py-1 max-h-24"
              style={{ scrollbarWidth: 'none' }}
            />
            <div className="flex items-center gap-2 shrink-0 pb-0.5">
              <button className="h-8 w-8 rounded-full flex items-center justify-center text-text-muted active:text-cyan-glow transition-colors">
                <Mic size={15} />
              </button>
              <button
                onClick={() => void handleSend(input)}
                disabled={!input.trim() || isSending}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: input.trim() && !isSending ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
                  border: input.trim() && !isSending ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Send size={13} className={input.trim() && !isSending ? 'text-cyan-glow' : 'text-text-muted'} />
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomSheet open={refillOpen} onClose={() => setRefillOpen(false)} title="Maximize Your Consultation">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '240', price: '$9.99' },
              { label: '720', price: '$19.99', selected: true },
              { label: '1080', price: '$29.99' },
              { label: '2160', price: '$39.99' },
            ].map((pack) => (
              <button
                key={pack.label}
                className="rounded-2xl p-3 text-left"
                style={{
                  background: 'rgba(15,30,53,0.82)',
                  border: pack.selected ? '1px solid rgba(34,211,238,0.6)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="font-display text-base font-bold text-[#F4E2B4]">{pack.label} gems</p>
                <p className="text-sm text-text-secondary mt-1">{pack.price}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setRefillOpen(false)
              setBillingIssueOpen(true)
            }}
            className="w-full rounded-full py-3 font-display font-bold text-midnight-950"
            style={{ background: 'linear-gradient(135deg, #22D3EE, #06B6D4)' }}
          >
            Continue
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={billingIssueOpen} onClose={() => setBillingIssueOpen(false)} title="Billing Issue">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            We could not process your payment due to a billing issue. Please update your card details to continue.
          </p>
          <button
            onClick={() => setBillingIssueOpen(false)}
            className="w-full rounded-full py-3 font-display font-bold text-midnight-950"
            style={{ background: 'linear-gradient(135deg, #22D3EE, #06B6D4)' }}
          >
            Update card details
          </button>
          <button
            onClick={() => setBillingIssueOpen(false)}
            className="w-full rounded-full py-3 font-display font-bold text-midnight-950"
            style={{ background: '#FBBF24' }}
          >
            PayPal
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
