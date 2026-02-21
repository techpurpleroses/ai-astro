import { TarotCard } from './tarot-card'
import { MagicBall } from './magic-ball'
import { LoveTipCard } from './love-tip-card'
import { DoDontCard } from './do-dont-card'
import { LuckyNumberCard } from './lucky-number-card'
import { SectionHeader } from '@/components/ui/section-header'
import type { DailyReadings } from '@/types'

interface DailyReadingsGridProps {
  readings: DailyReadings
}

export function DailyReadingsGrid({ readings }: DailyReadingsGridProps) {
  return (
    <div className="px-4 space-y-3">
      <SectionHeader title="Daily Readings" />

      {/* 2-column grid for card-sized items */}
      <div className="grid grid-cols-2 gap-3">
        <TarotCard card={readings.tarot} />
        <MagicBall data={readings.magicBall} />
        <LoveTipCard tip={readings.loveTip} detail={readings.loveDetail} />
        <DoDontCard dos={readings.dos} donts={readings.donts} />
      </div>

      {/* Full-width lucky number */}
      <div className="flex justify-center">
        <div className="w-1/2">
          <LuckyNumberCard
            number={readings.luckyNumber}
            explanation={readings.luckyNumberExplanation}
          />
        </div>
      </div>
    </div>
  )
}
