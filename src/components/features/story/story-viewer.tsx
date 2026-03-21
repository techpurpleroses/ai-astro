'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStoryArticle } from '@/hooks/use-stories'
import type { StoryCategory } from '@/types'

// ── Section card with feedback ─────────────────────────────────────────────────
function SectionCard({
  heading,
  body,
  bullets,
  accent,
}: {
  heading: string
  body: string
  bullets?: string[]
  accent: string
}) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(10,22,40,0.88)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <h3 className="font-display text-[15px] font-bold text-white leading-snug">{heading}</h3>
      {/* Colored divider */}
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

      {/* Feedback */}
      <div
        className="mt-4 pt-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-display flex-1">
          Was this useful?
        </span>
        <button
          onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
          className="h-8 w-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: feedback === 'up' ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.08)',
            border: feedback === 'up' ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
          }}
        >
          <ThumbsUp size={13} className={feedback === 'up' ? 'text-green-400' : 'text-white/40'} />
        </button>
        <button
          onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
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

// ── Single story slide ─────────────────────────────────────────────────────────
function StorySlide({ category }: { category: StoryCategory }) {
  const { data: article, isLoading } = useStoryArticle(category.id)

  return (
    <div className="h-full overflow-y-auto scrollbar-hide" style={{ touchAction: 'pan-y' }}>
      {/* Hero */}
      <div className="relative h-52 shrink-0 overflow-hidden">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `${category.accent}22` }} />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(3,8,18,0.15) 0%, rgba(3,8,18,0.94) 100%)',
          }}
        />
        {article && (
          <div className="absolute bottom-4 left-4 right-12">
            <h2 className="font-mystical text-2xl text-[#F8E7C3] leading-tight">{article.title}</h2>
            <p className="text-xs text-white/55 mt-1">{article.subtitle}</p>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="px-3 pt-3 pb-28 space-y-3">
        {isLoading && (
          <div className="py-10 flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          </div>
        )}
        {article?.sections.map((section, i) => (
          <SectionCard
            key={i}
            heading={section.heading}
            body={section.body}
            bullets={section.bullets}
            accent={article.accent}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main viewer ────────────────────────────────────────────────────────────────
interface StoryViewerProps {
  categories: StoryCategory[]
  startIndex?: number
  onClose: () => void
}

export function StoryViewer({ categories, startIndex = 0, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [direction, setDirection] = useState(0)
  // Portal guard — avoids SSR mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const current = categories[currentIndex]

  const goNext = () => {
    if (currentIndex < categories.length - 1) {
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
      {/* Full-screen dark backdrop */}
      <motion.div
        className="fixed inset-0 z-9998"
        style={{ background: 'rgba(0,0,0,0.88)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      />

      {/* 390px panel — centered with margin:auto (no transform conflict with y-anim) */}
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
        {/* ── Top chrome ── */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          {/* Segmented progress bar */}
          <div className="flex gap-0.75 mb-3">
            {categories.map((_, i) => (
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

          {/* Avatar + category name + close */}
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-full overflow-hidden shrink-0"
              style={{ border: '1.5px solid rgba(255,255,255,0.22)' }}
            >
              {current.image ? (
                <Image
                  src={current.image}
                  alt={current.title}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-full w-full" style={{ background: current.accent }} />
              )}
            </div>
            <p className="font-display text-sm font-bold text-white flex-1 truncate">
              {current.title}
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

        {/* ── Story content with swipe navigation ── */}
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
              <StorySlide category={current} />
            </motion.div>
          </AnimatePresence>

          {/* Tap zones on left/right edges — only over the hero area */}
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
