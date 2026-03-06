'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useCompatibility } from '@/hooks/use-compatibility'

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export function BestMatchesPageClient() {
  const router = useRouter()
  const { data } = useCompatibility()
  const [selectedSign, setSelectedSign] = useState('Capricorn')

  const matches = useMemo(() => {
    if (!data) return []
    return data.bestMatches[selectedSign.toLowerCase() as keyof typeof data.bestMatches] ?? []
  }, [data, selectedSign])

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
          <h1 className="font-display text-base font-bold text-text-primary">Best Matches</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          Choose the sign you are interested in and find out the best matches for this sign.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {SIGNS.map((sign) => {
            const active = selectedSign === sign
            return (
              <button
                key={sign}
                onClick={() => setSelectedSign(sign)}
                className="rounded-2xl p-3 space-y-2 text-center transition-all active:scale-[0.98]"
                style={{
                  background: active ? 'rgba(6,182,212,0.12)' : 'rgba(15,30,53,0.82)',
                  border: active ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="mx-auto h-12 w-12 rounded-full overflow-hidden border border-white/10">
                  <Image src={`/assets/zodiac/${sign.toLowerCase()}.png`} alt={sign} width={48} height={48} className="h-full w-full object-cover" />
                </div>
                <p className="font-display text-xs font-semibold text-text-primary">{sign}</p>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl p-4 glass-card">
          <h2 className="font-display text-sm font-bold text-text-primary mb-2">
            Best for {selectedSign}
          </h2>
          <div className="flex flex-wrap gap-2">
            {matches.map((match) => (
              <span
                key={match}
                className="rounded-full px-3 py-1 text-xs font-display font-semibold"
                style={{
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.25)',
                  color: '#22D3EE',
                }}
              >
                {match}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

