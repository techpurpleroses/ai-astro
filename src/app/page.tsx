import { LandingNav } from '@/components/landing/landing-nav'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { ZodiacSection } from '@/components/landing/zodiac-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { CtaSection } from '@/components/landing/cta-section'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060D1B] text-white overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <ZodiacSection />
      <TestimonialsSection />
      <CtaSection />
      <LandingFooter />
    </div>
  )
}
