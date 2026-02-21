import { cn } from '@/lib/utils'

interface MobileFrameProps {
  children: React.ReactNode
  className?: string
}

export function MobileFrame({ children, className }: MobileFrameProps) {
  return (
    /* Outer shell – fills viewport, dark bg visible on desktop sides */
    <div className="flex h-dvh w-full justify-center bg-midnight-950">
      {/* Subtle desktop gutter gradient */}
      <div className="pointer-events-none fixed inset-y-0 left-0 w-[calc(50%-195px)] bg-gradient-to-r from-black/20 to-transparent hidden lg:block" />
      <div className="pointer-events-none fixed inset-y-0 right-0 w-[calc(50%-195px)] bg-gradient-to-l from-black/20 to-transparent hidden lg:block" />

      {/* Mobile content column — fixed to exact viewport height so inner scroll works */}
      <div
        className={cn(
          'relative w-full max-w-[390px] h-dvh',
          'bg-midnight-950 cosmic-bg',
          'flex flex-col overflow-x-hidden',
          /* Subtle side borders on desktop */
          'lg:border-x lg:border-white/[0.04]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
