'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BottomNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick?: () => void
}

export function BottomNavItem({ href, icon, label, isActive, onClick }: BottomNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 py-2',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center transition-all duration-200',
          isActive ? 'text-cyan-glow scale-110' : 'text-text-muted',
        )}
      >
        {icon}
      </div>

      {/* Label */}
      <span
        className={cn(
          'font-display text-[10px] font-medium leading-none transition-colors duration-200',
          isActive ? 'text-lime-accent' : 'text-text-muted',
        )}
      >
        {label}
      </span>

      {/* Active dot */}
      {isActive && (
        <div className="absolute top-1 h-0.5 w-8 rounded-full bg-cyan-glow opacity-60" />
      )}
    </Link>
  )
}
