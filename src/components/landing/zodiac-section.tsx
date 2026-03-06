'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

gsap.registerPlugin(ScrollTrigger)

const ELEMENT_STYLE: Record<string, { ring: string; bg: string; label: string }> = {
  Fire:  { ring: 'ring-orange-500/60',  bg: 'bg-orange-500/10',  label: 'text-orange-400' },
  Earth: { ring: 'ring-emerald-500/60', bg: 'bg-emerald-500/10', label: 'text-emerald-400' },
  Air:   { ring: 'ring-sky-500/60',     bg: 'bg-sky-500/10',     label: 'text-sky-400' },
  Water: { ring: 'ring-cyan-500/60',    bg: 'bg-cyan-500/10',    label: 'text-cyan-400' },
}

const ZODIAC_DATA = [
  { name: 'Aries',       file: 'aries',       dates: 'Mar 21 – Apr 19', element: 'Fire'  },
  { name: 'Taurus',      file: 'taurus',      dates: 'Apr 20 – May 20', element: 'Earth' },
  { name: 'Gemini',      file: 'gemini',      dates: 'May 21 – Jun 20', element: 'Air'   },
  { name: 'Cancer',      file: 'cancer',      dates: 'Jun 21 – Jul 22', element: 'Water' },
  { name: 'Leo',         file: 'leo',         dates: 'Jul 23 – Aug 22', element: 'Fire'  },
  { name: 'Virgo',       file: 'virgo',       dates: 'Aug 23 – Sep 22', element: 'Earth' },
  { name: 'Libra',       file: 'libra',       dates: 'Sep 23 – Oct 22', element: 'Air'   },
  { name: 'Scorpio',     file: 'scorpio',     dates: 'Oct 23 – Nov 21', element: 'Water' },
  { name: 'Sagittarius', file: 'sagittarius', dates: 'Nov 22 – Dec 21', element: 'Fire'  },
  { name: 'Capricorn',   file: 'capricorn',   dates: 'Dec 22 – Jan 19', element: 'Earth' },
  { name: 'Aquarius',    file: 'aquarius',    dates: 'Jan 20 – Feb 18', element: 'Air'   },
  { name: 'Pisces',      file: 'pisces',      dates: 'Feb 19 – Mar 20', element: 'Water' },
]

export function ZodiacSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.zodiac-heading', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.zodiac-heading', start: 'top 88%' },
      })

      gsap.from('.zodiac-chip', {
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        stagger: 0.045,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.zodiac-grid', start: 'top 80%' },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="zodiac"
      ref={sectionRef}
      className="relative py-28 px-6 bg-[#060D1B]"
    >
      {/* Background nebula */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_60%,rgba(167,139,250,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="zodiac-heading text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full border border-violet-400/20 bg-violet-400/8 text-violet-400 text-xs font-semibold tracking-widest uppercase mb-4">
            The Twelve Signs
          </span>
          <h2 className="font-mystical text-[clamp(2rem,5vw,3.5rem)] font-bold text-white leading-tight mb-4">
            What&apos;s Your{' '}
            <span className="text-gradient-gold">Sign?</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Select your zodiac to unlock personalized readings, compatibility reports, and daily guidance.
          </p>
        </div>

        {/* Zodiac grid */}
        <div className="zodiac-grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
          {ZODIAC_DATA.map((sign) => {
            const style = ELEMENT_STYLE[sign.element]
            const isHovered = hovered === sign.name

            return (
              <Link href="/today" key={sign.name}>
                <motion.div
                  className="zodiac-chip relative flex flex-col items-center gap-2.5 p-3 rounded-2xl border border-white/6 bg-midnight-800/40 cursor-pointer transition-colors duration-200"
                  onHoverStart={() => setHovered(sign.name)}
                  onHoverEnd={() => setHovered(null)}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: isHovered ? `rgba(13,26,48,0.9)` : undefined,
                    borderColor: isHovered ? 'rgba(6,182,212,0.3)' : undefined,
                  }}
                >
                  {/* Sign image */}
                  <motion.div
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-transparent transition-all duration-200 ${isHovered ? style.ring : ''} ${isHovered ? style.bg : ''}`}
                    animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Image
                      src={`/assets/zodiac/${sign.file}.png`}
                      alt={sign.name}
                      fill
                      className="object-contain p-1"
                    />
                    {isHovered && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      />
                    )}
                  </motion.div>

                  {/* Name */}
                  <span className={`text-xs font-semibold transition-colors duration-200 ${isHovered ? 'text-white' : 'text-slate-400'}`}>
                    {sign.name}
                  </span>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <motion.div
                      className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20 bg-midnight-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-center whitespace-nowrap pointer-events-none"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-[10px] text-slate-400">{sign.dates}</p>
                      <p className={`text-[10px] font-bold ${style.label}`}>{sign.element}</p>
                    </motion.div>
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>

        {/* Element legend */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {Object.entries(ELEMENT_STYLE).map(([element, style]) => (
            <div key={element} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${style.bg} ${style.ring} ring-1`} />
              <span className={`text-xs ${style.label}`}>{element}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
    </section>
  )
}

