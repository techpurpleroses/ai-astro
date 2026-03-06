'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { TarotCard as TarotCardType } from '@/types'

interface TarotCardProps {
  card: TarotCardType
}

export function TarotCard({ card }: TarotCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="rounded-2xl overflow-hidden text-left relative h-[188px]"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,20,38,0.92)' }}
      >
        <div className="absolute inset-0">
          <Image
            src="/assets/today/horoscope/horoscope-card-bg.png"
            alt=""
            fill
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06213a] via-[#06162a]/75 to-[#08111f]" />
        </div>

        <div className="relative h-full px-3 pt-3 pb-2 flex flex-col">
          <p className="font-display text-[15px] font-bold leading-tight text-white">Card of the day</p>
          <div className="flex-1 flex items-center justify-center">
            <Image
              src="/assets/today/horoscope/tarot-cards.webp"
              alt="Tarot cards"
              width={112}
              height={112}
              className="h-[92px] w-[92px] object-contain"
            />
          </div>
          <div
            className="rounded-xl py-2 text-center text-xs font-display font-semibold text-[#E2E8F0]"
            style={{ background: 'linear-gradient(180deg, rgba(71,85,105,0.7), rgba(51,65,85,0.9))' }}
          >
            Your Card Awaits
          </div>
        </div>
      </button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={card.name}>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div
              className="h-28 w-20 rounded-xl flex items-center justify-center text-4xl"
              style={{
                background: 'linear-gradient(135deg, #0f2547, #1D3054)',
                border: '1px solid rgba(245,158,11,0.4)',
                boxShadow: '0 0 20px rgba(245,158,11,0.2)',
              }}
            >
              *
            </div>
          </div>

          <div className="flex justify-center">
            <span className="rounded-full bg-gold-accent/15 border border-gold-accent/30 px-3 py-1 text-[11px] font-medium text-gold-accent uppercase tracking-wider">
              {card.arcana === 'major' ? 'Major Arcana' : `${card.suit} - Minor Arcana`}
              {card.arcana === 'major' && ` | ${card.number}`}
            </span>
          </div>

          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] font-display font-semibold text-cyan-glow uppercase tracking-widest mb-2">
              Tip of the Day
            </p>
            <p className="text-sm leading-relaxed text-text-primary italic font-mystical">
              &quot;{card.tipOfDay}&quot;
            </p>
          </div>

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
