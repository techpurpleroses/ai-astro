'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  className?: string
  onClick?: () => void
  label?: string
}

export function BackButton({ className, onClick, label = 'Back' }: BackButtonProps) {
  const router = useRouter()

  function handleClick() {
    if (onClick) {
      onClick()
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1 text-text-secondary transition-colors active:text-cyan-glow',
        className,
      )}
      aria-label={label}
    >
      <ChevronLeft size={20} />
      <span className="font-display text-sm">{label}</span>
    </button>
  )
}
