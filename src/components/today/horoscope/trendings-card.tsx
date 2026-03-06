'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface TrendingsCardProps {
  question: string
}

export function TrendingsCard({ question }: TrendingsCardProps) {
  return (
    <div className="px-4 space-y-3">
      <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest">
        Trendings
      </p>

      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,20,38,0.92)' }}
      >
        <div className="absolute inset-0">
          <Image src="/assets/today/horoscope/astrocartography.webp" alt="Astrocartography" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020a22]/85 via-[#020a22]/35 to-[#020a22]/95" />
        </div>

        <div className="relative p-4 min-h-[320px] flex flex-col">
          <h3 className="font-display text-[31px] font-bold text-white">Astrocartography</h3>
          <p className="text-sm leading-snug text-[#CBD5E1] max-w-[230px] mt-1">
            {question}
          </p>
          <div className="mt-auto pt-4">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Get the Answer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
