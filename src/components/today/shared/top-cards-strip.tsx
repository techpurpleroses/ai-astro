'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface TopCardsStripItem {
  id: string
  label: string
  image: string
  href?: string
  onClick?: () => void
}

interface TopCardsStripProps {
  items: TopCardsStripItem[]
  className?: string
  cardClassName?: string
  borderColor?: string
  imageClassName?: string
  minCardHeight?: number
  cardHeightRatio?: number
}

export function TopCardsStrip({
  items,
  className,
  cardClassName,
  borderColor = 'rgba(132,204,22,0.88)',
  imageClassName,
  minCardHeight = 116,
  cardHeightRatio = 1.1,
}: TopCardsStripProps) {
  const router = useRouter()
  const railRef = useRef<HTMLDivElement | null>(null)
  const [railWidth, setRailWidth] = useState(0)
  const gap = 10
  const sidePadding = 2
  const cardsPerView = 3

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const sync = () => {
      setRailWidth(rail.clientWidth)
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(rail)

    return () => observer.disconnect()
  }, [])

  const cardWidth = useMemo(() => {
    if (!railWidth) return 112
    const computed = (railWidth - sidePadding * 2 - gap * (cardsPerView - 1)) / cardsPerView
    return Math.max(92, Math.floor(computed))
  }, [railWidth, sidePadding, gap, cardsPerView])

  const cardHeight = useMemo(
    () => Math.max(minCardHeight, Math.round(cardWidth * cardHeightRatio)),
    [cardWidth, minCardHeight, cardHeightRatio],
  )

  return (
    <div className={cn('px-4', className)}>
      <div
        ref={railRef}
        data-no-nav-swipe="true"
        className="flex overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory scroll-smooth"
        style={{ gap: `${gap}px`, paddingLeft: `${sidePadding}px`, paddingRight: `${sidePadding}px` }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.href) {
                router.push(item.href)
                return
              }
              item.onClick?.()
            }}
            className={cn(
              'relative shrink-0 overflow-hidden rounded-2xl text-left snap-start',
              cardClassName,
            )}
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              background: 'rgba(11,31,47,0.94)',
              border: `1px solid ${borderColor}`,
            }}
            aria-label={item.label}
          >
            <Image
              src={item.image}
              alt={item.label}
              fill
              className={cn('object-cover', imageClassName)}
              sizes={`${cardWidth}px`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50" />
            <p className="absolute bottom-1.5 left-2 right-2 line-clamp-2 text-[11px] font-display font-semibold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {item.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
