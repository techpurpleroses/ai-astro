'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useTarotDeck } from '@/hooks/use-tarot'
import type { TarotCard } from '@/types'

// ── Asset constants ───────────────────────────────────────────────────────────
const CARD_BACK_SRC = '/assets/scraped/misc/unclassified/back-of-the-card-0c3fb8c220249b006d02251d466a327b.png'
const CARD_FALLBACK_SRC = '/assets/scraped/misc/unclassified/card-default-949c5c3cc1ff82cb6d13e4d031149887.png'

// Supabase Storage bucket for individual card artwork.
// Images stored as: tarot-cards/{imageSlug}.jpg  (e.g. major-00.jpg, wands-01.jpg)
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
const TAROT_CDN = `${SUPABASE_URL}/storage/v1/object/public/tarot-cards`

function tarotCardSrc(imageSlug: string | null | undefined): string {
  if (!imageSlug || !SUPABASE_URL) return CARD_FALLBACK_SRC
  return `${TAROT_CDN}/${imageSlug}.jpg`
}

// ── Card face image with automatic fallback ───────────────────────────────────
// Uses Supabase CDN URL; falls back to generic card if not yet uploaded.
function CardFaceImage({
  imageSlug,
  alt,
  className = 'absolute inset-0 w-full h-full object-cover',
}: {
  imageSlug: string | null | undefined
  alt: string
  className?: string
}) {
  const [errored, setErrored] = useState(false)
  const src = errored ? CARD_FALLBACK_SRC : tarotCardSrc(imageSlug)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  )
}

// ── Color helpers ─────────────────────────────────────────────────────────────
const SUIT_COLORS: Record<string, string> = {
  wands: '#F59E0B',
  cups: '#06B6D4',
  swords: '#94A3B8',
  pentacles: '#22C55E',
}
const MAJOR_PALETTE = ['#A78BFA', '#F59E0B', '#06B6D4', '#EF4444', '#22C55E', '#F97316', '#EC4899']

function getCardColor(card: TarotCard): string {
  if (card.suit && SUIT_COLORS[card.suit]) return SUIT_COLORS[card.suit]
  return MAJOR_PALETTE[card.number % MAJOR_PALETTE.length]
}

interface DisplayCard extends TarotCard { color: string }
function toDisplayCard(card: TarotCard): DisplayCard {
  return { ...card, color: getCardColor(card) }
}

// ── Spread types ──────────────────────────────────────────────────────────────
export type SpreadType = 'single' | 'near-future' | 'love' | 'yes-no'

const SLOT_W = 80
const SLOT_H = 124
const SLOT_GAP = 8
// Stagger delay between each card flipping during reveal (ms)
const STAGGER_MS = 420
// Duration of each card flip (ms) — keep in sync with transition below
const FLIP_MS = 700

const SPREAD_CONFIG: Record<SpreadType, {
  colSpan: number
  rowSpan: number
  positions: Array<{ col: number; row: number }>
  labels: string[]
}> = {
  single: {
    colSpan: 1, rowSpan: 1,
    positions: [{ col: 0, row: 0 }],
    labels: ['Your Card'],
  },
  'yes-no': {
    colSpan: 1, rowSpan: 1,
    positions: [{ col: 0, row: 0 }],
    labels: ["Oracle's Answer"],
  },
  'near-future': {
    colSpan: 4, rowSpan: 2,
    positions: [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
      { col: 1, row: 1 },
    ],
    labels: ['Past', 'Present', 'Near Future', 'Hidden Factor', 'Guidance'],
  },
  love: {
    colSpan: 3, rowSpan: 3,
    positions: [
      { col: 1, row: 0 },
      { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
      { col: 1, row: 2 },
    ],
    labels: ['Your Heart', 'Their Energy', 'The Bond', 'The Challenge', 'Destiny'],
  },
}

// ── Card slot ─────────────────────────────────────────────────────────────────
function CardSlot({
  card,
  isNext,
  revealed,
  index,
}: {
  card: DisplayCard | null
  isNext: boolean
  revealed: boolean
  index: number
}) {
  const filled = card !== null
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        width: SLOT_W,
        height: SLOT_H,
        border: filled
          ? 'none'
          : isNext
          ? '1.5px dashed rgba(99,209,191,0.55)'
          : '1.5px dashed rgba(99,209,191,0.22)',
        background: filled ? 'transparent' : 'rgba(14,32,60,0.5)',
        boxShadow: filled
          ? '0 6px 28px rgba(0,0,0,0.6)'
          : isNext
          ? '0 0 14px rgba(45,212,191,0.12)'
          : 'none',
      }}
    >
      {!filled ? (
        <div className="w-full h-full flex items-center justify-center">
          <span className={isNext ? 'text-teal-400/40 text-xl' : 'text-teal-400/14 text-xl'}>✦</span>
        </div>
      ) : !revealed ? (
        /* Card placed but not yet revealed — show back face only */
        <div className="relative w-full h-full rounded-xl overflow-hidden">
          <Image src={CARD_BACK_SRC} alt="Card back" fill className="object-cover" sizes={`${SLOT_W}px`} />
        </div>
      ) : (
        /* Reveal: flip from back to face */
        <div className="w-full h-full" style={{ perspective: 700 }}>
          <motion.div
            className="relative w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 180 }}
            transition={{
              duration: FLIP_MS / 1000,
              delay: index * STAGGER_MS / 1000,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {/* back face */}
            <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
              <Image src={CARD_BACK_SRC} alt="Card back" fill className="object-cover" sizes={`${SLOT_W}px`} />
            </div>
            {/* front face */}
            <div
              className="absolute inset-0 rounded-xl overflow-hidden"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <CardFaceImage imageSlug={card!.imageSlug} alt={card!.name} />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(6,14,28,0.88) 36%, transparent 100%)' }}
              />
              <div className="absolute bottom-1.5 inset-x-0 text-center px-1">
                <p className="font-mystical text-[8px] leading-snug" style={{ color: card!.color }}>
                  {card!.name}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// ── Spread area ───────────────────────────────────────────────────────────────
function SpreadArea({
  spreadType,
  selectedCards,
  revealed,
}: {
  spreadType: SpreadType
  selectedCards: Array<DisplayCard | null>
  revealed: boolean
}) {
  const config = SPREAD_CONFIG[spreadType]
  const isSingle = config.positions.length === 1
  const nextEmpty = selectedCards.findIndex(c => c === null)

  if (isSingle) {
    return (
      <div className="flex justify-center">
        <CardSlot card={selectedCards[0] ?? null} isNext revealed={revealed} index={0} />
      </div>
    )
  }

  const gridW = config.colSpan * SLOT_W + (config.colSpan - 1) * SLOT_GAP
  const gridH = config.rowSpan * SLOT_H + (config.rowSpan - 1) * SLOT_GAP

  return (
    <div className="flex justify-center">
      <div className="relative" style={{ width: gridW, height: gridH }}>
        {config.positions.map((pos, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: pos.col * (SLOT_W + SLOT_GAP),
              top: pos.row * (SLOT_H + SLOT_GAP),
            }}
          >
            <CardSlot card={selectedCards[i] ?? null} isNext={i === nextEmpty} revealed={revealed} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Fan ───────────────────────────────────────────────────────────────────────
const TOTAL_FAN = 26
const FAN_CARD_W = 64
const FAN_CARD_H = 100
// Pivot point below card bottom — larger = flatter arc
const FAN_PIVOT_BELOW = 160
// Total angular spread across all cards (wider = more cards visible at edges)
const FAN_SPREAD = 120
// Drag: how many degrees the fan rotates per px of horizontal drag
const DRAG_DEG_PER_PX = 0.16
// Max drag range in px (limits how far you can spin the fan)
const FAN_MAX_DRAG_PX = Math.round((FAN_SPREAD / 2) / DRAG_DEG_PER_PX)

function buildFanAngles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1) // 0..1
    return (t - 0.5) * FAN_SPREAD               // e.g. –60..+60 deg
  })
}

function CardFan({
  cards,
  onPick,
  disabled,
  pickedIndices,
}: {
  cards: DisplayCard[]
  onPick: (index: number) => void
  disabled: boolean
  pickedIndices: Set<number>
}) {
  const angles = useMemo(() => buildFanAngles(cards.length), [cards.length])
  const center = Math.floor(cards.length / 2)

  // dragX drives the fan rotation; the element itself stays visually centred
  const dragX = useMotionValue(0)
  // Counteract actual x translation so the anchor div never moves position
  const counterX = useTransform(dragX, v => -v)
  // Convert drag distance → fan rotation angle
  const fanRotation = useTransform(dragX, v => -v * DRAG_DEG_PER_PX)

  return (
    <div
      className="relative flex justify-center items-end"
      style={{ height: 160, overflow: 'hidden', perspective: 700 }}
    >
      {/* Draggable fan anchor — stays centered, rotates based on drag */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -FAN_MAX_DRAG_PX, right: FAN_MAX_DRAG_PX }}
        dragElastic={0.06}
        dragMomentum
        className="relative"
        style={{
          width: FAN_CARD_W,
          height: FAN_CARD_H,
          x: dragX,
          translateX: counterX,
          rotate: fanRotation,
          transformOrigin: `center calc(100% + ${FAN_PIVOT_BELOW}px)`,
          cursor: 'grab',
          touchAction: 'pan-y',
        }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {angles.map((angle, i) => {
          if (pickedIndices.has(i)) return null
          const zIndex = cards.length - Math.abs(i - center)
          return (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{
                transformOrigin: `center calc(100% + ${FAN_PIVOT_BELOW}px)`,
                rotate: angle,
                zIndex,
              }}
              whileTap={disabled ? {} : { scale: 1.1, zIndex: 80 }}
              transition={{ duration: 0.16 }}
            >
              <button
                onClick={() => !disabled && onPick(i)}
                className="relative w-full h-full rounded-2xl overflow-hidden focus:outline-none"
                disabled={disabled}
                style={{
                  boxShadow: '0 8px 24px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.13)',
                }}
              >
                <Image
                  src={CARD_BACK_SRC}
                  alt="Tarot card"
                  fill
                  className="object-cover"
                  sizes={`${FAN_CARD_W}px`}
                  unoptimized
                />
              </button>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface TarotReadingProps {
  title: string
  subtitle: string
  promptText: string
  accentColor: string
  spreadType?: SpreadType
}

export function TarotReadingPage({
  title,
  subtitle,
  promptText,
  accentColor,
  spreadType = 'single',
}: TarotReadingProps) {
  const router = useRouter()
  const { data: deckCards } = useTarotDeck()

  const slotCount = SPREAD_CONFIG[spreadType].positions.length
  const [selectedCards, setSelectedCards] = useState<Array<DisplayCard | null>>(
    Array(slotCount).fill(null)
  )
  const [pickedDeckIndices, setPickedDeckIndices] = useState<Set<number>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  // Phase 1: cards flip face-up; Phase 2: "Get Result" button visible
  const [revealed, setRevealed] = useState(false)
  const [readingDone, setReadingDone] = useState(false)

  const displayCards = useMemo<DisplayCard[]>(() => {
    if (!deckCards || deckCards.length === 0) return []
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, TOTAL_FAN).map(toDisplayCard)
  }, [deckCards])

  const allFilled = selectedCards.every(c => c !== null)
  const nextEmptySlot = selectedCards.findIndex(c => c === null)

  const handlePick = (fanIndex: number) => {
    if (allFilled || pickedDeckIndices.has(fanIndex)) return
    const card = displayCards[fanIndex]
    if (!card || nextEmptySlot === -1) return
    const next = [...selectedCards]
    next[nextEmptySlot] = card
    setSelectedCards(next)
    setPickedDeckIndices(new Set([...pickedDeckIndices, fanIndex]))
  }

  // Step 1 — flip cards one by one; reveal "Get Result" after last flip
  const handleReveal = () => {
    setRevealed(true)
    const flipsDone = (slotCount - 1) * STAGGER_MS + FLIP_MS + 350
    setTimeout(() => setReadingDone(true), flipsDone)
  }

  // Step 2 — open the comprehensive analysis sheet
  const handleGetResult = () => setSheetOpen(true)

  const handleReset = () => {
    setSheetOpen(false)
    setReadingDone(false)
    setRevealed(false)
    setSelectedCards(Array(slotCount).fill(null))
    setPickedDeckIndices(new Set())
  }

  const isSingle = slotCount === 1

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: 'calc(100dvh - 68px)',
        background: 'linear-gradient(180deg, #070d1a 0%, #0b1830 55%, #060f20 100%)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <h1 className="font-display text-base font-bold text-text-primary">{title}</h1>
      </div>

      {/* Slots + prompt */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 pb-2">
        <SpreadArea spreadType={spreadType} selectedCards={selectedCards} revealed={revealed} />

        <AnimatePresence mode="wait">
          {!allFilled && (
            <motion.p
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-white/42 leading-relaxed px-6 max-w-xs"
            >
              {promptText}
            </motion.p>
          )}

          {/* Step 1: Flip cards */}
          {allFilled && !revealed && (
            <motion.button
              key="reveal-btn"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={handleReveal}
              className="px-10 py-3.5 rounded-full text-sm font-bold tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                color: '#fff',
                boxShadow: '0 0 28px rgba(124,58,237,0.45)',
              }}
            >
              ✦ Reveal My Cards
            </motion.button>
          )}

          {/* Step 2: Get full reading — appears after all cards have flipped */}
          {readingDone && !sheetOpen && (
            <motion.button
              key="result-btn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleGetResult}
              className="px-10 py-3.5 rounded-full text-sm font-bold tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #2dd4bf, #0ea5e9)',
                color: '#060e1c',
                boxShadow: '0 0 28px rgba(45,212,191,0.42)',
              }}
            >
              Get My Reading ✦
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Fan */}
      <div className="shrink-0" style={{ paddingBottom: 12 }}>
        <CardFan
          cards={displayCards}
          onPick={handlePick}
          disabled={allFilled}
          pickedIndices={pickedDeckIndices}
        />
        <div className="text-center mt-2">
          <span
            className="text-[11px] text-white/28 tracking-wider select-none"
            style={{ fontFamily: 'monospace' }}
          >
            &#8592;&nbsp;&#xB7;&nbsp;&#xB7;&nbsp;&#xB7;&nbsp;Choose the card&nbsp;&#xB7;&nbsp;&#xB7;&nbsp;&#xB7;&nbsp;&#8594;
          </span>
        </div>
      </div>

      {/* Comprehensive reading sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={handleReset}
        title={isSingle ? (selectedCards[0]?.name ?? 'Your Card') : `${title} Reading`}
      >
        <div className="space-y-6 pb-2">

          {/* ── Per-card sections ── */}
          {selectedCards
            .filter((c): c is DisplayCard => c !== null)
            .map((card, i) => {
              const positionLabel = SPREAD_CONFIG[spreadType].labels[i] ?? `Card ${i + 1}`
              return (
                <div key={i}>
                  {/* Position label */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-px flex-1"
                      style={{ background: `linear-gradient(to right, transparent, ${card.color}44)` }}
                    />
                    <span
                      className="text-[10px] font-display font-bold uppercase tracking-[0.18em] px-2"
                      style={{ color: card.color }}
                    >
                      {positionLabel}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: `linear-gradient(to left, transparent, ${card.color}44)` }}
                    />
                  </div>

                  {/* Card hero row */}
                  <div
                    className="rounded-2xl p-4 flex gap-4 items-start"
                    style={{ background: `${card.color}0d`, border: `1px solid ${card.color}28` }}
                  >
                    {/* Large card image */}
                    <div
                      className="shrink-0 rounded-xl overflow-hidden"
                      style={{
                        width: 72,
                        height: 112,
                        boxShadow: `0 4px 20px ${card.color}33, 0 2px 8px rgba(0,0,0,0.5)`,
                        border: `1px solid ${card.color}44`,
                      }}
                    >
                      <CardFaceImage
                        imageSlug={card.imageSlug}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Card meta */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mystical text-[17px] leading-tight mb-1" style={{ color: card.color }}>
                        {card.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider"
                          style={{
                            background: card.arcana === 'major' ? `${card.color}22` : 'rgba(255,255,255,0.07)',
                            color: card.arcana === 'major' ? card.color : '#94A3B8',
                            border: `1px solid ${card.arcana === 'major' ? card.color + '44' : 'rgba(255,255,255,0.1)'}`,
                          }}
                        >
                          {card.arcana === 'major' ? 'Major Arcana' : 'Minor Arcana'}
                        </span>
                        {card.suit && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider bg-white/5 text-text-muted border border-white/8">
                            {card.suit}
                          </span>
                        )}
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider bg-white/5 text-text-muted border border-white/8">
                          No. {card.number}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {card.uprightMeaning}
                      </p>
                    </div>
                  </div>

                  {/* Tip of the Day highlight */}
                  {card.tipOfDay && (
                    <div
                      className="mt-3 rounded-xl px-4 py-3 flex gap-3 items-start"
                      style={{
                        background: 'linear-gradient(135deg, rgba(45,212,191,0.08), rgba(14,165,233,0.06))',
                        border: '1px solid rgba(45,212,191,0.18)',
                      }}
                    >
                      <span className="text-teal-400 text-base shrink-0 mt-0.5">✦</span>
                      <div>
                        <p className="text-[9px] font-display font-bold text-teal-400/70 uppercase tracking-widest mb-1">
                          Cosmic Guidance
                        </p>
                        <p className="text-[12px] text-teal-300/90 leading-relaxed italic">
                          &ldquo;{card.tipOfDay}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          {/* ── Combined reading synthesis ── */}
          {slotCount > 1 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(124,58,237,0.06))',
                border: '1px solid rgba(167,139,250,0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-purple-400 text-sm">✦</span>
                <p className="text-[10px] font-display font-bold text-purple-400/80 uppercase tracking-[0.16em]">
                  What the Stars Reveal
                </p>
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                {(() => {
                  const filled = selectedCards.filter((c): c is DisplayCard => c !== null)
                  const majorCount = filled.filter(c => c.arcana === 'major').length
                  const suits = [...new Set(filled.map(c => c.suit).filter(Boolean))]
                  let synthesis = ''
                  if (majorCount === filled.length) {
                    synthesis = 'The Major Arcana dominates this reading — powerful cosmic forces and life-defining energies are at work. This is a moment of deep significance; the universe is steering your path with intention.'
                  } else if (majorCount > filled.length / 2) {
                    synthesis = 'With several Major Arcana cards present, the cosmos is playing an active role in your situation. Alongside earthly influences, larger spiritual lessons are unfolding around you.'
                  } else if (suits.length === 1) {
                    synthesis = `The ${suits[0]} suit flows through every position of this spread — a unified message of ${suits[0] === 'cups' ? 'emotional depth and intuition' : suits[0] === 'wands' ? 'passion and creative fire' : suits[0] === 'swords' ? 'clarity and mental strength' : 'material wisdom and abundance'}. Trust this singular focus.`
                  } else {
                    synthesis = 'The cards draw from different realms of experience, reflecting the multi-layered nature of your question. Honor each message individually, then listen for the thread that connects them all.'
                  }
                  return synthesis
                })()}
              </p>
            </div>
          )}

          {/* Draw again */}
          <button
            onClick={handleReset}
            className="w-full py-3.5 rounded-2xl text-sm font-display font-semibold text-text-muted"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Draw Again
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
