'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'

interface LuckyNumberCardProps {
  number: number
  explanation: string
}

export function LuckyNumberCard({ number, explanation }: LuckyNumberCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card-interactive rounded-2xl p-3 flex flex-col items-center gap-2 w-full"
      >
        <span className="text-[10px] font-display font-semibold text-gold-accent uppercase tracking-widest">
          Lucky Number
        </span>

        {/* Number display */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.2), rgba(245,158,11,0.04))',
            border: '1px solid rgba(245,158,11,0.35)',
            boxShadow: '0 0 16px rgba(245,158,11,0.25)',
          }}
        >
          <span className="font-mystical text-2xl font-bold text-gold-accent">{number}</span>
        </div>

        <p className="text-[11px] text-text-muted text-center">Tap to learn why</p>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={`Lucky Number · ${number}`}>
        <div className="space-y-4">
          {/* Large number */}
          <div className="flex justify-center">
            <div
              className="h-24 w-24 flex items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245,158,11,0.15), rgba(245,158,11,0.03))',
                border: '2px solid rgba(245,158,11,0.4)',
                boxShadow: '0 0 30px rgba(245,158,11,0.2)',
              }}
            >
              <span className="font-mystical text-5xl font-bold text-gold-accent">{number}</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              {explanation}
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
