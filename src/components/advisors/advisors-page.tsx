'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Star, MessageCircle, Clock, Zap, Heart, ChevronRight, Settings } from 'lucide-react'
import Image from 'next/image'
import { useAdvisors } from '@/hooks/use-advisors'
import { SkeletonCard } from '@/components/ui/skeleton'
import type { Advisor } from '@/types'

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

function AdvisorCard({ advisor, onChat }: { advisor: Advisor; onChat: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex gap-3 items-start active:bg-white/5 transition-colors">
      <div className="relative shrink-0">
        <div className="h-14 w-14 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(167,139,250,0.15))' }}
        >
          {advisor.avatar ? (
            <Image src={advisor.avatar} alt={advisor.name} width={56} height={56} className="h-full w-full object-cover" />
          ) : (
            <span className="h-full w-full flex items-center justify-center text-lg font-display font-bold">
              {advisor.name.split(' ').map((p) => p[0]).join('')}
            </span>
          )}
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-midnight-800"
          style={{ background: advisor.isOnline ? '#22C55E' : '#4E6179' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold text-text-primary">{advisor.name}</h3>
            <p className="text-[10px] text-text-muted font-display">{advisor.specialty}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={11} className="text-gold-accent fill-gold-accent" />
            <span className="text-[11px] font-display font-bold text-gold-accent">{advisor.rating}</span>
          </div>
        </div>
        <p className="text-xs text-text-secondary mt-1.5 leading-snug line-clamp-2">{advisor.tagline}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Clock size={9} className="text-text-muted" />
            <span className="text-[9px] text-text-muted">{advisor.responseTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={9} className="text-text-muted" />
            <span className="text-[9px] text-text-muted">{advisor.reviewCount.toLocaleString()} reviews</span>
          </div>
          <span className="text-[9px] text-lime-accent font-display font-semibold ml-auto">${advisor.ratePerMinute}/min</span>
        </div>
        <button
          onClick={onChat}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-display font-semibold transition-all active:scale-98"
          style={advisor.isOnline ? {
            background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06B6D4',
          } : {
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#4E6179',
          }}
        >
          {advisor.isOnline ? (
            <>
              <Zap size={11} className="text-cyan-glow" />
              Chat Now
            </>
          ) : (
            <>
              <Clock size={11} />
              Leave Message
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function MyChatsStrip({
  advisors,
  recentIds,
  onSelect,
  onViewAll,
}: {
  advisors: Advisor[]
  recentIds: string[]
  onSelect: (id: string) => void
  onViewAll: () => void
}) {
  const recent = recentIds.map((id) => advisors.find((advisor) => advisor.id === id)).filter(Boolean) as Advisor[]
  if (!recent.length) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <p className="text-[11px] font-display font-semibold text-text-primary">My chats</p>
        <button onClick={onViewAll} className="text-[10px] text-cyan-glow font-display">All advisors &gt;</button>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
        {recent.map((advisor) => (
            <button key={advisor.id} onClick={() => onSelect(advisor.id)} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="relative">
                <div
                  className="h-14 w-14 rounded-full overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(167,139,250,0.12))', border: '1px solid rgba(6,182,212,0.2)' }}
                >
                  {advisor.avatar ? (
                    <Image src={advisor.avatar} alt={advisor.name} width={56} height={56} className="h-full w-full object-cover" />
                  ) : (
                    <span className="h-full w-full flex items-center justify-center text-sm font-display font-bold">
                      {advisor.name.split(' ').map((p) => p[0]).join('')}
                    </span>
                  )}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-midnight-800"
                  style={{ background: advisor.isOnline ? '#22C55E' : '#4E6179' }}
                />
              </div>
              <span className="text-[9px] text-text-secondary font-display w-14 text-center leading-tight">
                {advisor.name.split(' ')[0]}
              </span>
            </button>
        ))}
      </div>
    </div>
  )
}

function AskQuestionCTA({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="mx-4 glass-card rounded-2xl p-3.5 flex items-center gap-3" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.2), rgba(6,182,212,0.04))', border: '1px solid rgba(6,182,212,0.25)' }}
      >
        <MessageCircle size={16} className="text-cyan-glow" />
      </div>
      <button
        onClick={onAsk}
        className="flex-1 text-left rounded-xl px-3 py-2 text-sm text-text-muted"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        Ask your question...
      </button>
      <ChevronRight size={16} className="text-text-muted shrink-0" />
    </div>
  )
}

export function AdvisorsClient() {
  const router = useRouter()
  const { data, isLoading } = useAdvisors()

  const handleChat = (advisorId: string) => {
    router.push(`/advisors/${advisorId}`)
  }

  const goToFirstChat = () => {
    if (!data?.advisors?.length) return
    const target = data.advisors.find((advisor) => advisor.isOnline) ?? data.advisors[0]
    router.push(`/advisors/${target.id}`)
  }

  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center"
        style={{ background: 'linear-gradient(to bottom, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.85) 100%)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
          <span className="text-xs font-display font-bold text-cyan-glow">S</span>
        </div>
        <div className="flex-1 flex justify-center">
          <div>
            <p className="font-mystical text-[10px] text-text-muted tracking-widest text-center">LIVE READINGS</p>
            <h1 className="font-display text-base font-bold text-text-primary leading-tight text-center">Advisors</h1>
          </div>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6 border border-white/10 mr-2"
        >
          <Settings size={14} className="text-text-secondary" />
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <Heart size={14} className="text-rose-accent" />
          <span className="text-[10px] font-display font-bold text-rose-accent">0</span>
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4 px-4 pt-4">
          <SkeletonCard className="h-20 rounded-3xl" />
          {[1, 2, 3].map((item) => <SkeletonCard key={item} className="h-28" />)}
        </div>
      )}

      {data && (
        <div className="space-y-5 pt-4 pb-6">
          <FadeIn delay={0}>
            <MyChatsStrip
              advisors={data.advisors}
              recentIds={data.recentChats}
              onSelect={handleChat}
              onViewAll={() => router.push('/advisors')}
            />
          </FadeIn>

          <FadeIn delay={0.04}>
            <AskQuestionCTA onAsk={goToFirstChat} />
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="px-4 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-text-primary">Online Now</h2>
                <span className="text-[9px] font-display font-bold text-lime-accent bg-lime-accent/10 border border-lime-accent/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {data.advisors.filter((advisor: Advisor) => advisor.isOnline).length} Live
                </span>
              </div>
              {data.advisors
                .filter((advisor: Advisor) => advisor.isOnline)
                .map((advisor: Advisor) => (
                  <AdvisorCard key={advisor.id} advisor={advisor} onChat={() => handleChat(advisor.id)} />
                ))}
            </div>
          </FadeIn>

          {data.advisors.some((advisor: Advisor) => !advisor.isOnline) && (
            <FadeIn delay={0.14}>
              <div className="px-4 space-y-3">
                <h2 className="font-display text-[10px] font-semibold text-text-muted uppercase tracking-widest">Available Later</h2>
                {data.advisors
                  .filter((advisor: Advisor) => !advisor.isOnline)
                  .map((advisor: Advisor) => (
                    <AdvisorCard key={advisor.id} advisor={advisor} onChat={() => handleChat(advisor.id)} />
                  ))}
              </div>
            </FadeIn>
          )}
        </div>
      )}
    </div>
  )
}
