'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Menu, X } from 'lucide-react'

const PAGE_LINKS = [
  { label: 'Zodiac',       href: '/zodiac' },
  { label: 'Horoscope',   href: '/horoscope' },
  { label: 'Palm Reading', href: '/palm' },
  { label: 'Birth Chart',  href: '/natal-chart' },
  { label: 'About',        href: '/about' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <motion.nav
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-500"
        style={{
          background: scrolled ? 'rgba(6,13,27,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(6,182,212,0.07)' : '1px solid transparent',
        }}
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="max-w-7xl mx-auto px-5 xl:px-8 h-16 flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full bg-linear-to-br from-cyan-400 to-violet-500 opacity-90 group-hover:opacity-100 transition-opacity" />
              <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-white" />
            </div>
            <span className="font-mystical text-[17px] font-bold text-white tracking-wide">
              Astro<span className="text-gradient-cyan">AI</span>
            </span>
          </Link>

          {/* ── Desktop links ── */}
          <nav className="hidden lg:flex items-center gap-1">
            {PAGE_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    active
                      ? 'text-white bg-white/8'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-white/8 border border-white/8"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* ── Right: CTA + hamburger ── */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/auth/signup">
              <motion.button
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-linear-to-r from-cyan-500 to-teal-400 text-midnight-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-shadow cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Open App
              </motion.button>
            </Link>

            {/* Hamburger (visible < lg) */}
            <button
              aria-label="Toggle menu"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-x-0 top-16 z-40 bg-[#060D1B]/96 backdrop-blur-2xl border-b border-white/5 lg:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 py-6 flex flex-col gap-1">
              {PAGE_LINKS.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center py-3 px-2 rounded-xl text-base font-medium transition-colors border-b border-white/4 ${
                      pathname === link.href
                        ? 'text-cyan-400'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <Link href="/auth/signup" className="mt-4" onClick={() => setMenuOpen(false)}>
                <motion.button
                  className="w-full py-3.5 rounded-full bg-linear-to-r from-cyan-500 to-teal-400 text-midnight-950 font-bold text-sm cursor-pointer"
                  whileTap={{ scale: 0.97 }}
                >
                  Open App Free
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
