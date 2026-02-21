'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'

interface LoveTipCardProps {
  tip: string
  detail: string
}

export function LoveTipCard({ tip, detail }: LoveTipCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card-interactive rounded-2xl p-3 flex flex-col items-center gap-2 w-full"
      >
        <span className="text-[10px] font-display font-semibold text-rose-accent uppercase tracking-widest">
          Love
        </span>
        {/* Heart glow visual */}
        <div className="relative flex items-center justify-center h-14 w-14">
          <div
            className="absolute inset-0 rounded-full opacity-30 animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.6), transparent)' }}
          />
          <Heart size={28} className="text-rose-accent fill-rose-accent/30 relative z-10" />
        </div>
        <p className="text-[11px] text-text-muted text-center leading-relaxed line-clamp-2">
          {tip}
        </p>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Love">
        <div className="space-y-4">
          {/* Big heart visual */}
          <div className="flex justify-center py-2">
            <div className="relative">
              <div
                className="absolute inset-[-16px] rounded-full opacity-25"
                style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.7), transparent)' }}
              />
              <Heart size={64} className="text-rose-accent fill-rose-accent/40 relative z-10" />
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <p className="font-mystical text-sm text-text-primary italic leading-relaxed mb-3">
              "{tip}"
            </p>
            <div className="h-px bg-white/[0.06]" />
            <p className="text-sm leading-relaxed text-text-secondary mt-3">
              {detail}
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
