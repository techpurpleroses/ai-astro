'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'

interface DoDontCardProps {
  dos: string[]
  donts: string[]
}

export function DoDontCard({ dos, donts }: DoDontCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card-interactive rounded-2xl p-3 flex flex-col items-center gap-2 w-full"
      >
        <span className="text-[10px] font-display font-semibold text-cyan-glow uppercase tracking-widest">
          Do / Don&apos;t
        </span>

        {/* Balance icon */}
        <div className="flex items-end gap-1 h-14">
          <div className="flex flex-col items-center gap-1">
            <Check size={18} className="text-lime-accent" />
            <div className="h-8 w-1 bg-lime-accent/40 rounded-full" />
          </div>
          <div className="h-0.5 w-10 bg-white/20 rounded-full mb-4" />
          <div className="flex flex-col items-center gap-1">
            <X size={18} className="text-rose-accent" />
            <div className="h-6 w-1 bg-rose-accent/40 rounded-full" />
          </div>
        </div>

        <p className="text-[11px] text-text-muted text-center">
          Today&apos;s cosmic guidance
        </p>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Do / Don't">
        <div className="space-y-4">
          {/* Do section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-lime-accent/20 flex items-center justify-center">
                <Check size={14} className="text-lime-accent" />
              </div>
              <h3 className="font-display text-sm font-semibold text-lime-accent">Do</h3>
            </div>
            <ul className="space-y-2">
              {dos.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check size={14} className="text-lime-accent mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Don't section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-rose-accent/20 flex items-center justify-center">
                <X size={14} className="text-rose-accent" />
              </div>
              <h3 className="font-display text-sm font-semibold text-rose-accent">Don&apos;t</h3>
            </div>
            <ul className="space-y-2">
              {donts.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <X size={14} className="text-rose-accent mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
