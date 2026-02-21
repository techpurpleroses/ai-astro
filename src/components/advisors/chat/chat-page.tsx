'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, Send, Mic, Lock } from 'lucide-react'
import { useAdvisor, useChatMessages, useSuggestedQuestions } from '@/hooks/use-advisors'
import { SkeletonCard } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import type { ChatMessage, TarotCard } from '@/types'

// ── Session timer ─────────────────────────────────────────────────────────────

function SessionTimer({ isOnline }: { isOnline: boolean }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isOnline) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isOnline])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-1.5 bg-gold-accent/10 border border-gold-accent/25 px-3 py-1 rounded-full">
      <div className="h-1.5 w-1.5 rounded-full bg-gold-accent animate-pulse" />
      <span className="text-[10px] font-display font-bold text-gold-accent tabular-nums">
        {mm}:{ss}
      </span>
    </div>
  )
}

// ── Inline tarot card in chat ─────────────────────────────────────────────────

function InlineTarotCard({ card }: { card: TarotCard }) {
  return (
    <div
      className="mt-2 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-400/20">
        <span className="text-violet-400 text-sm">✦</span>
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

// ── Message bubble ────────────────────────────────────────────────────────────

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
          {advisorName.split(' ').map((n) => n[0]).join('')}
        </div>
      )}

      <div className={`max-w-[78%] ${isAdvisor ? '' : ''}`}>
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
        <p className={`text-[9px] text-text-muted mt-1 ${isAdvisor ? '' : 'text-right'}`}>
          {time}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main chat page ────────────────────────────────────────────────────────────

export function ChatPageClient({ advisorId }: { advisorId: string }) {
  const router = useRouter()
  const advisor = useAdvisor(advisorId)
  const { data: messages, isLoading } = useChatMessages(advisorId)
  const { data: suggested } = useSuggestedQuestions()
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages) setLocalMessages(messages)
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return
    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      advisorId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, newMsg])
    setInput('')
  }, [advisorId])

  if (!advisor) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <SkeletonCard className="h-24 w-72" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
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

        {/* Advisor info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-sm font-bold text-text-primary">{advisor.name}</p>
            {advisor.isOnline && (
              <div className="h-1.5 w-1.5 rounded-full bg-lime-accent" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Star size={9} className="text-gold-accent fill-gold-accent" />
            <span className="text-[9px] text-text-muted">{advisor.rating} · {advisor.specialty}</span>
          </div>
        </div>

        {advisor.isOnline && <SessionTimer isOnline={advisor.isOnline} />}
      </div>

      {/* ── Confidentiality notice ── */}
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-2 text-center justify-center"
        style={{ background: 'rgba(6,182,212,0.05)', borderBottom: '1px solid rgba(6,182,212,0.08)' }}
      >
        <Lock size={9} className="text-text-muted" />
        <p className="text-[9px] text-text-muted">All sessions are private & confidential</p>
      </div>

      {/* ── Message thread ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-16" />)}
          </div>
        )}

        {localMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} advisorName={advisor.name} />
        ))}

        {/* Suggested questions (shown at bottom if few messages) */}
        {localMessages.length < 4 && suggested && (
          <div className="pt-2">
            <p className="text-[10px] text-text-muted mb-2 font-display">Suggested questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-[10px] text-cyan-glow bg-cyan-glow/8 border border-cyan-glow/20 px-3 py-1.5 rounded-full font-display transition-all active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Message input ── */}
      <div
        className="shrink-0 px-4 py-3 border-t border-white/5"
        style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(16px)' }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{ background: 'rgba(15,30,53,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(input)
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
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: input.trim() ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
                border: input.trim() ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Send size={13} className={input.trim() ? 'text-cyan-glow' : 'text-text-muted'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
