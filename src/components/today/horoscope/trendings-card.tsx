'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { GlassCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/section-header'

interface TrendingsCardProps {
  question: string
}

export function TrendingsCard({ question }: TrendingsCardProps) {
  const gridRef = useRef<SVGSVGElement>(null)
  const markersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gridRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(gridRef.current, {
        rotationY: 360,
        duration: 22,
        repeat: -1,
        ease: 'none',
        transformOrigin: 'center center',
      })

      if (markersRef.current) {
        gsap.to(markersRef.current.querySelectorAll('.planet-marker'), {
          scale: 1.4,
          opacity: 0.9,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          stagger: 0.5,
          ease: 'power2.inOut',
        })
      }
    })

    return () => ctx.revert()
  }, [])

  return (
    <GlassCard padding="none" className="mx-4 overflow-hidden">
      <div className="p-4">
        <SectionHeader title="Trendings" className="mb-4" />

        {/* Globe + question layout */}
        <div className="flex items-center gap-4">
          {/* Globe */}
          <div className="relative shrink-0">
            {/* Sphere */}
            <div
              className="h-[88px] w-[88px] rounded-full relative overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, rgba(6,182,212,0.35) 0%, rgba(15,30,80,0.8) 45%, rgba(10,22,40,0.95) 100%)',
                boxShadow:
                  'inset -12px -12px 24px rgba(0,0,0,0.5), 0 0 24px rgba(6,182,212,0.15)',
              }}
            >
              {/* Grid lines SVG overlay */}
              <svg
                ref={gridRef}
                className="absolute inset-0 h-full w-full opacity-30"
                viewBox="0 0 88 88"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Latitude lines */}
                {[15, 30, 44, 58, 73].map((y, i) => (
                  <ellipse
                    key={`lat-${i}`}
                    cx="44" cy={y}
                    rx={i === 2 ? 40 : Math.abs(2 - i) === 1 ? 34 : 20}
                    ry="3"
                    fill="none"
                    stroke="rgba(6,182,212,0.6)"
                    strokeWidth="0.5"
                  />
                ))}
                {/* Longitude lines */}
                {[0, 45, 90, 135].map((angle, i) => (
                  <ellipse
                    key={`lon-${i}`}
                    cx="44" cy="44"
                    rx="40" ry="3"
                    fill="none"
                    stroke="rgba(6,182,212,0.5)"
                    strokeWidth="0.5"
                    transform={`rotate(${angle} 44 44)`}
                  />
                ))}
              </svg>

              {/* Planet markers */}
              <div ref={markersRef} className="absolute inset-0">
                <div className="planet-marker absolute top-[20%] left-[25%] h-2 w-2 rounded-full bg-gold-accent opacity-70" />
                <div className="planet-marker absolute top-[55%] left-[60%] h-1.5 w-1.5 rounded-full bg-violet-accent opacity-60" />
                <div className="planet-marker absolute top-[35%] left-[70%] h-2 w-2 rounded-full bg-cyan-glow opacity-80" />
              </div>

              {/* Shine */}
              <div
                className="absolute top-[12%] left-[18%] h-[22%] w-[28%] rounded-full opacity-45"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent)' }}
              />
            </div>

            {/* Axial tilt ring */}
            <div
              className="absolute inset-[-4px] rounded-full border border-cyan-glow/15"
              style={{ transform: 'rotateX(70deg)' }}
            />
          </div>

          {/* Question text */}
          <div className="flex-1">
            <p className="font-display text-sm font-semibold text-text-primary leading-snug mb-3">
              {question}
            </p>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Get the Answer
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
