'use client'

import Image from 'next/image'
import { HorizontalRail } from '@/components/today/shared/horizontal-rail'

const ALTERNATIVE_ITEMS = [
  { id: 'indian-lunar', label: 'Indian lunar', image: '/assets/today/horoscope/indian-lunar.webp' },
  { id: 'indian-solar', label: 'Indian solar', image: '/assets/today/horoscope/indian-solar.webp' },
  { id: 'mayan', label: 'Mayan', image: '/assets/today/horoscope/mayan.webp' },
  { id: 'chinese', label: 'Chinese', image: '/assets/today/horoscope/chinese.webp' },
  { id: 'druid', label: 'Druid', image: '/assets/today/horoscope/druid.webp' },
]

export function AlternativeHoroscope() {
  return (
    <div className="px-4 space-y-3">
      <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest">
        Alternative horoscopes
      </p>

      <HorizontalRail className="px-0 pt-0 pb-1" trackClassName="gap-3 pr-0">
        {ALTERNATIVE_ITEMS.map((item) => (
          <button
            key={item.id}
            className="w-[110px] shrink-0 rounded-2xl p-2.5 text-center min-h-[126px]"
            style={{ background: 'rgba(8,20,38,0.92)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="mx-auto h-[74px] w-[74px] relative">
              <Image src={item.image} alt={item.label} fill className="object-contain" />
            </div>
            <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-[11px] font-display font-semibold text-[#E2E8F0] capitalize">
              {item.label}
            </p>
          </button>
        ))}
      </HorizontalRail>
    </div>
  )
}
