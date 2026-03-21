'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { astroFetch } from '@/lib/client/astro-fetch'

export interface TodayStorySection {
  heading: string
  body: string
  bullets?: string[]
}

export interface TodayStoryCard {
  id: string
  label: string
  image: string
  accent: string
  sections: TodayStorySection[]
}

// ── Section card ────────────────────────────────────────────────────────────
function SectionCard({
  heading, body, bullets, accent, storyId,
}: TodayStorySection & { accent: string; storyId: string }) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  function sendFeedback(sentiment: 'up' | 'down') {
    void astroFetch('/api/dashboard/analytics', {
      debugOrigin: 'story-viewer.feedback',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'story_feedback',
        properties: { storyId, sectionHeading: heading, sentiment },
      }),
    })
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(10,22,40,0.88)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <h3 className="font-display text-[15px] font-bold text-white leading-snug">{heading}</h3>
      <div className="h-0.5 w-8 mt-1.5 mb-3 rounded-full" style={{ background: accent }} />
      <p className="text-sm text-white/65 leading-relaxed">{body}</p>

      {bullets && bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/55">
              <span style={{ color: accent }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        className="mt-4 pt-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-display flex-1">
          Was this useful?
        </span>
        <button
          onClick={() => {
            const next = feedback === 'up' ? null : 'up'
            setFeedback(next)
            if (next === 'up') sendFeedback('up')
          }}
          className="h-8 w-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: feedback === 'up' ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.08)',
            border: feedback === 'up' ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
          }}
        >
          <ThumbsUp size={13} className={feedback === 'up' ? 'text-green-400' : 'text-white/40'} />
        </button>
        <button
          onClick={() => {
            const next = feedback === 'down' ? null : 'down'
            setFeedback(next)
            if (next === 'down') sendFeedback('down')
          }}
          className="h-8 w-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: feedback === 'down' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
            border: feedback === 'down' ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
          }}
        >
          <ThumbsDown size={13} className={feedback === 'down' ? 'text-red-400' : 'text-white/40'} />
        </button>
      </div>
    </div>
  )
}

// ── Single card slide ────────────────────────────────────────────────────────
function CardSlide({ card }: { card: TodayStoryCard }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide" style={{ touchAction: 'pan-y' }}>
      {/* Hero */}
      <div className="relative h-52 shrink-0 overflow-hidden">
        <Image
          src={card.image}
          alt={card.label}
          fill
          className="object-cover"
          sizes="390px"
          unoptimized
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(3,8,18,0.15) 0%, rgba(3,8,18,0.94) 100%)',
          }}
        />
        <div className="absolute bottom-4 left-4 right-12">
          <h2 className="font-mystical text-2xl text-[#F8E7C3] leading-tight">{card.label}</h2>
        </div>
      </div>

      {/* Sections */}
      <div className="px-3 pt-3 pb-28 space-y-3">
        {card.sections.map((section, i) => (
          <SectionCard
            key={i}
            heading={section.heading}
            body={section.body}
            bullets={section.bullets}
            accent={card.accent}
            storyId={card.id}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main viewer ─────────────────────────────────────────────────────────────
interface TodayStoryViewerProps {
  cards: TodayStoryCard[]
  startIndex?: number
  onClose: () => void
}

export function TodayStoryViewer({ cards, startIndex = 0, onClose }: TodayStoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [direction, setDirection] = useState(0)
  // Portal guard — avoids SSR mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const current = cards[currentIndex]

  const goNext = () => {
    if (currentIndex < cards.length - 1) {
      setDirection(1)
      setCurrentIndex(i => i + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(i => i - 1)
    }
  }

  if (!current || !mounted) return null

  const overlay = (
    <>
      {/* Full-screen dark backdrop — rendered at document.body level via portal */}
      <motion.div
        className="fixed inset-0 z-9998"
        style={{ background: 'rgba(0,0,0,0.88)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      />

      {/* 390px panel — fixed, centered with margin:auto (no transform conflict with y-anim) */}
      <motion.div
        className="fixed inset-y-0 z-9999 flex flex-col w-full"
        style={{
          background: '#03080e',
          maxWidth: 390,
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top chrome */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          {/* Segmented progress bar */}
          <div className="flex gap-0.75 mb-3">
            {cards.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-0.75 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                <motion.div
                  className="h-full rounded-full bg-white"
                  animate={{ width: i <= currentIndex ? '100%' : '0%' }}
                  transition={{ duration: i === currentIndex ? 0.3 : 0 }}
                />
              </div>
            ))}
          </div>

          {/* Avatar + label + close */}
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-full overflow-hidden shrink-0"
              style={{ border: `1.5px solid ${current.accent}66` }}
            >
              <Image
                src={current.image}
                alt={current.label}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            <p className="font-display text-sm font-bold text-white flex-1 truncate">
              {current.label}
            </p>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              aria-label="Close"
            >
              <X size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* Story content with swipe navigation */}
        <motion.div
          className="flex-1 overflow-hidden relative"
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) goNext()
            else if (info.offset.x > 60) goPrev()
          }}
          style={{ touchAction: 'pan-y' }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d >= 0 ? '30%' : '-30%', opacity: 0 }),
                center: { x: '0%', opacity: 1 },
                exit: (d: number) => ({ x: d >= 0 ? '-30%' : '30%', opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              <CardSlide card={current} />
            </motion.div>
          </AnimatePresence>

          {/* Tap zones on hero area */}
          <div
            className="absolute left-0 top-0 w-[28%] h-52 z-20"
            onClick={goPrev}
            style={{ cursor: currentIndex > 0 ? 'pointer' : 'default' }}
          />
          <div
            className="absolute right-0 top-0 w-[28%] h-52 z-20"
            onClick={goNext}
            style={{ cursor: 'pointer' }}
          />
        </motion.div>
      </motion.div>
    </>
  )

  return createPortal(overlay, document.body)
}
