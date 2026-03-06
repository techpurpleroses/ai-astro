'use client'

import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CosmicMiniCardFrameProps {
  dateLabel: string
  backgroundImage: string
  className?: string
  imageOpacityClassName?: string
  overlayClassName?: string
  contentClassName?: string
  children: React.ReactNode
}

export function CosmicMiniCardFrame({
  dateLabel,
  backgroundImage,
  className,
  imageOpacityClassName = 'opacity-90',
  overlayClassName = 'bg-gradient-to-b from-transparent to-[#071425]/78',
  contentClassName,
  children,
}: CosmicMiniCardFrameProps) {
  return (
    <article
      className={cn(
        'relative h-[208px] w-[176px] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-[#091728]',
        className,
      )}
    >
      <Image
        src={backgroundImage}
        alt=""
        fill
        className={cn('object-cover', imageOpacityClassName)}
        sizes="176px"
        aria-hidden
      />
      <div className={cn('absolute inset-0', overlayClassName)} />

      <div className={cn('relative flex h-full flex-col p-3', contentClassName)}>
        <div className="flex items-center justify-between text-[12px] text-slate-300/90">
          <span>{dateLabel}</span>
          <ArrowUpRight size={14} className="text-slate-200/75" />
        </div>
        {children}
      </div>
    </article>
  )
}
