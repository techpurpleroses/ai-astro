import { LandingNav } from '@/components/landing/landing-nav'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060D1B] text-white overflow-x-hidden">
      <LandingNav />
      <main className="pt-16">{children}</main>
      <LandingFooter />
    </div>
  )
}
