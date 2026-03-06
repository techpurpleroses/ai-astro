'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useCompatibility } from '@/hooks/use-compatibility'

const TABS = [
  { id: 'love', label: 'Love', color: '#F43F5E' },
  { id: 'career', label: 'Career', color: '#06B6D4' },
  { id: 'friendship', label: 'Friendship', color: '#84CC16' },
  { id: 'sex', label: 'Sex', color: '#A78BFA' },
] as const

type MatchTab = (typeof TABS)[number]['id']

export function TodaysMatchesPageClient() {
  const router = useRouter()
  const { data } = useCompatibility()
  const [active, setActive] = useState<MatchTab>('love')

  const matches = data?.todaysMatches[active] ?? []

  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(10,22,40,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">COMPATIBILITY</p>
          <h1 className="font-display text-base font-bold text-text-primary">Today&apos;s Matches</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">
        <div className="grid grid-cols-4 gap-1.5 rounded-xl p-1.5 glass-card">
          {TABS.map((tab) => {
            const activeTab = tab.id === active
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className="rounded-full py-1.5 text-[11px] font-display font-semibold transition-colors"
                style={{
                  background: activeTab ? '#F4E2B4' : 'transparent',
                  color: activeTab ? '#0A1628' : '#94A3B8',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {matches.map((match) => (
          <article
            key={`${match.sign1}-${match.sign2}`}
            className="rounded-2xl p-3.5 glass-card"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-11 w-11 rounded-full overflow-hidden border border-white/10">
                  <Image src={`/assets/zodiac/${match.sign1.toLowerCase()}.png`} alt={match.sign1} width={44} height={44} className="h-full w-full object-cover" />
                </div>
                <span className="text-text-muted">×</span>
                <div className="h-11 w-11 rounded-full overflow-hidden border border-white/10">
                  <Image src={`/assets/zodiac/${match.sign2.toLowerCase()}.png`} alt={match.sign2} width={44} height={44} className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-semibold text-text-primary">
                  {match.sign1} + {match.sign2}
                </h3>
                <p className="text-xs text-text-secondary line-clamp-2">{match.note}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-muted">Score</p>
                <p className="font-display text-base font-bold text-lime-accent">{match.score}%</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

