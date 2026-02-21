import { format } from 'date-fns'
import { Circle } from 'lucide-react'
import { SectionHeader } from '@/components/ui/section-header'
import { ZODIAC_GLYPHS, ZODIAC_NAMES, ELEMENT_COLORS, ZODIAC_ELEMENTS } from '@/lib/constants'
import type { MoonEvent } from '@/types'

const PHASE_ICONS: Record<string, string> = {
  'New Moon':       '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter':  '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon':      '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter':   '🌗',
  'Waning Crescent': '🌘',
}

interface UpcomingMoonEventsProps {
  events: MoonEvent[]
}

export function UpcomingMoonEvents({ events }: UpcomingMoonEventsProps) {
  return (
    <div className="px-4">
      <SectionHeader title="Upcoming Moon Events" className="mb-3" />

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-4 bottom-4 w-px bg-gradient-to-b from-slate-400/30 via-slate-400/20 to-transparent" />

        <div className="space-y-4">
          {events.map((event, i) => {
            const elementColor = ELEMENT_COLORS[ZODIAC_ELEMENTS[event.sign]]
            return (
              <div key={i} className="flex gap-4 items-start pl-2">
                {/* Timeline node */}
                <div
                  className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{
                    background: `radial-gradient(circle, ${elementColor}30, rgba(10,22,40,0.9))`,
                    border: `1px solid ${elementColor}40`,
                  }}
                >
                  {PHASE_ICONS[event.type] ?? <Circle size={10} />}
                </div>

                {/* Content */}
                <div className="flex-1 glass-card rounded-xl p-3 -mt-0.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-display text-xs font-semibold text-text-primary">
                      {event.type}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span style={{ color: elementColor }} className="text-xs">
                        {ZODIAC_GLYPHS[event.sign]}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {ZODIAC_NAMES[event.sign]}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-cyan-glow font-display mb-1">
                    {format(new Date(event.date), 'EEEE, MMM d')}
                  </p>
                  <p className="text-[11px] leading-relaxed text-text-secondary">
                    {event.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
