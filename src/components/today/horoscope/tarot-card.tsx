'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { cn } from '@/lib/utils'
import type { TarotCard as TarotCardType } from '@/types'

interface TarotCardProps {
  card: TarotCardType
}

export function TarotCard({ card }: TarotCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  function handleTap() {
    if (!isFlipped) {
      setIsFlipped(true)
    } else {
      setSheetOpen(true)
    }
  }

  return (
    <>
      {/* Compact card in grid */}
      <button
        onClick={handleTap}
        className="glass-card-interactive rounded-2xl p-3 flex flex-col items-center gap-2 w-full"
      >
        <span className="text-[10px] font-display font-semibold text-cyan-glow uppercase tracking-widest">
          Card of the Day
        </span>

        {/* Flip container */}
        <div className="relative h-[80px] w-[56px]" style={{ perspective: 600 }}>
          {/* Card back */}
          <motion.div
            className="absolute inset-0 rounded-lg preserve-3d backface-hide"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Card back face */}
            <div className="absolute inset-0 rounded-lg backface-hide overflow-hidden">
              <div
                className="h-full w-full rounded-lg"
                style={{
                  background:
                    'linear-gradient(135deg, #1D3054 0%, #162540 50%, #1D3054 100%)',
                  border: '1px solid rgba(6,182,212,0.25)',
                }}
              >
                {/* Mystical pattern */}
                <div className="flex h-full w-full items-center justify-center">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full border border-cyan-glow/30 flex items-center justify-center">
                      <Sparkles size={14} className="text-cyan-glow/60" />
                    </div>
                    <div className="absolute inset-[-6px] rounded-full border border-cyan-glow/10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card front face */}
            <motion.div
              className="absolute inset-0 rounded-lg backface-hide overflow-hidden"
              style={{ rotateY: 180, transformStyle: 'preserve-3d' }}
            >
              <div
                className="h-full w-full rounded-lg flex items-center justify-center text-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, #0f2547 0%, #1D3054 100%)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  boxShadow: '0 0 12px rgba(245,158,11,0.15)',
                }}
              >
                ✦
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="text-center">
          <p className={cn(
            'font-mystical text-[11px] font-bold transition-colors duration-300',
            isFlipped ? 'text-gold-accent' : 'text-text-muted',
          )}>
            {isFlipped ? card.name : 'Tap to reveal'}
          </p>
          {isFlipped && (
            <p className="text-[9px] text-text-muted mt-0.5">Tap again for details</p>
          )}
        </div>
      </button>

      {/* Detail sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={card.name}
      >
        <div className="space-y-4">
          {/* Card visual */}
          <div className="flex justify-center">
            <div
              className="h-28 w-20 rounded-xl flex items-center justify-center text-4xl"
              style={{
                background: 'linear-gradient(135deg, #0f2547, #1D3054)',
                border: '1px solid rgba(245,158,11,0.4)',
                boxShadow: '0 0 20px rgba(245,158,11,0.2)',
              }}
            >
              ✦
            </div>
          </div>

          {/* Major arcana badge */}
          <div className="flex justify-center">
            <span className="rounded-full bg-gold-accent/15 border border-gold-accent/30 px-3 py-1 text-[11px] font-medium text-gold-accent uppercase tracking-wider">
              {card.arcana === 'major' ? 'Major Arcana' : `${card.suit} — Minor Arcana`}
              {card.arcana === 'major' && ` · ${card.number}`}
            </span>
          </div>

          {/* Tip */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] font-display font-semibold text-cyan-glow uppercase tracking-widest mb-2">
              Tip of the Day
            </p>
            <p className="text-sm leading-relaxed text-text-primary italic font-mystical">
              "{card.tipOfDay}"
            </p>
          </div>

          {/* Meaning */}
          <div>
            <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest mb-2">
              Meaning
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              {card.uprightMeaning}
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
