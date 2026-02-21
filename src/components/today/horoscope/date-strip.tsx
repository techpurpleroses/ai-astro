'use client'

import { useMemo } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateStripProps {
  selected: Date
  onSelect: (date: Date) => void
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DateStrip({ selected, onSelect }: DateStripProps) {
  const today = useMemo(() => new Date(), [])

  const dates = useMemo(() => {
    const arr: Date[] = []
    for (let i = -3; i <= 3; i++) {
      arr.push(addDays(today, i))
    }
    return arr
  }, [today])

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1">
      {dates.map((date) => {
        const isSelected = isSameDay(date, selected)
        const isToday = isSameDay(date, today)

        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelect(date)}
            className={cn(
              'flex shrink-0 flex-col items-center gap-1 rounded-full px-3 py-2',
              'transition-all duration-200 min-w-[52px]',
              isSelected
                ? 'bg-cyan-glow shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                : 'bg-midnight-800/60 border border-white/8 active:bg-midnight-700',
            )}
          >
            <span
              className={cn(
                'font-display text-[10px] font-medium leading-none',
                isSelected ? 'text-midnight-950' : 'text-text-muted',
              )}
            >
              {DAY_NAMES[date.getDay()]}
            </span>
            <span
              className={cn(
                'font-display text-sm font-bold leading-none',
                isSelected ? 'text-midnight-950' : isToday ? 'text-cyan-glow' : 'text-text-primary',
              )}
            >
              {format(date, 'd')}
            </span>
          </button>
        )
      })}
    </div>
  )
}
