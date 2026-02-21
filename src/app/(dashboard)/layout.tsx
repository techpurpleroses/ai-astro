import { Providers } from '@/components/layout/providers'
import { MobileFrame } from '@/components/layout/mobile-frame'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <MobileFrame>
        {/* Scrollable content area */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth pb-[68px]">
          {children}
        </main>
        <BottomNav />
      </MobileFrame>
    </Providers>
  )
}
