'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SectionHeroCardProps {
  backgroundImage: string
  backgroundAlt?: string
  borderColor?: string
  className?: string
  overlayClassName?: string
  contentClassName?: string
  children: React.ReactNode
}

export function SectionHeroCard({
  backgroundImage,
  backgroundAlt = '',
  borderColor = 'rgba(6,182,212,0.24)',
  className,
  overlayClassName,
  contentClassName,
  children,
}: SectionHeroCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[20px] bg-[#08182d] shadow-[0_12px_28px_rgba(0,0,0,0.45)]',
        className,
      )}
      style={{ border: `1px solid ${borderColor}` }}
    >
      <Image
        src={backgroundImage}
        alt={backgroundAlt}
        fill
        className="object-cover opacity-90"
        sizes="100vw"
        aria-hidden={backgroundAlt === ''}
      />
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-b from-black/15 via-[#071628]/10 to-[#071628]/75',
          overlayClassName,
        )}
      />
      <div className={cn('relative px-4 pt-4 pb-3', contentClassName)}>{children}</div>
    </div>
  )
}
