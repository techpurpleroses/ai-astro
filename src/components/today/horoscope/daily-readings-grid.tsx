import { TarotCard } from './tarot-card'
import { MagicBall } from './magic-ball'
import type { DailyReadings } from '@/types'

interface DailyReadingsGridProps {
  readings: DailyReadings
}

export function DailyReadingsGrid({ readings }: DailyReadingsGridProps) {
  return (
    <div className="px-4 space-y-3">
      <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest">
        Daily readings
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TarotCard card={readings.tarot} />
        <MagicBall data={readings.magicBall} />
      </div>
    </div>
  )
}
