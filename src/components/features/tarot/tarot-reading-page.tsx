'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useTarotDeck } from '@/hooks/use-tarot'
import type { TarotCard } from '@/types'

const CARD_BACK_SRC = '/assets/scraped/misc/unclassified/back-of-the-card-0c3fb8c220249b006d02251d466a327b.png'
const CARD_DEFAULT_SRC = '/assets/scraped/misc/unclassified/card-default-949c5c3cc1ff82cb6d13e4d031149887.png'

// ── Color helpers ──────────────────────────────────────────────────────────────
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

// ── Phase ──────────────────────────────────────────────────────────────────────
type Phase = 'selecting' | 'selected' | 'opening' | 'reading'

// ── Fan card (back) ────────────────────────────────────────────────────────────
function FanCard({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -10, scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      className="relative shrink-0 rounded-xl overflow-hidden focus:outline-none"
      style={{ width: 66, height: 106, boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}
    >
      <Image src={CARD_BACK_SRC} alt="Tarot card" fill className="object-cover" sizes="66px" />
    </motion.button>
  )
}

// ── Slot card (top placeholder or selected) ────────────────────────────────────
function SlotCard({ phase, card }: { phase: Phase; card: DisplayCard | null }) {
  const empty = phase === 'selecting'
  const flipped = phase === 'opening' || phase === 'reading'

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        width: 120,
        height: 188,
        border: empty ? '1.5px dashed rgba(99,209,191,0.4)' : 'none',
        background: empty ? 'rgba(20,40,70,0.4)' : 'transparent',
        boxShadow: empty ? 'none' : '0 12px 40px rgba(0,0,0,0.7)',
      }}
    >
      {empty ? (
        /* placeholder glow corners */
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-teal-400/30 text-2xl">✦</span>
        </div>
      ) : (
        /* flip animation */
        <div className="w-full h-full" style={{ perspective: 900 }}>
          <motion.div
            className="relative w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* back face */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
              <Image src={CARD_BACK_SRC} alt="Card back" fill className="object-cover" sizes="120px" />
            </div>
            {/* front face */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-end pb-4 px-2"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <Image src={CARD_DEFAULT_SRC} alt="Card face" fill className="object-cover" sizes="120px" />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(6,14,28,0.9) 40%, transparent 100%)' }}
              />
              {card && (
                <div className="relative z-10 text-center">
                  <p className="font-mystical text-[11px] leading-tight" style={{ color: card.color }}>{card.name}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface TarotReadingProps {
  title: string
  subtitle: string
  promptText: string
  accentColor: string
}

// ── Main reading page ──────────────────────────────────────────────────────────
export function TarotReadingPage({ title, subtitle, promptText, accentColor }: TarotReadingProps) {
  const router = useRouter()
  const { data: deckCards } = useTarotDeck()

  const [phase, setPhase] = useState<Phase>('selecting')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const displayCards = useMemo<DisplayCard[]>(() => {
    if (!deckCards || deckCards.length === 0) return []
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 9).map(toDisplayCard)
  }, [deckCards])

  const card = selectedIndex !== null ? (displayCards[selectedIndex] ?? null) : null

  const handleCardSelect = (index: number) => {
    if (phase !== 'selecting') return
    setSelectedIndex(index)
    setPhase('selected')
  }

  const handleOpenCard = () => {
    setPhase('opening')
    setTimeout(() => {
      setSheetOpen(true)
      setPhase('reading')
    }, 800)
  }

  const handleReset = () => {
    setSheetOpen(false)
    setPhase('selecting')
    setSelectedIndex(null)
  }

  // Fan arc: 9 cards, wide spread that bleeds off screen edges
  const CARD_COUNT = 9
  const FAN_SPREAD = 420        // total horizontal span (wider than phone)
  const FAN_MAX_ROTATE = 28     // degrees at edge

  const fanPositions = Array.from({ length: CARD_COUNT }, (_, i) => {
    const t = i / (CARD_COUNT - 1)   // 0 → 1
    const norm = t * 2 - 1            // -1 → +1
    const x = norm * (FAN_SPREAD / 2)
    const y = norm * norm * 18        // edges drop slightly
    const rotate = norm * FAN_MAX_ROTATE
    return { x, y, rotate }
  })

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1e3a 100%)' }}>

      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <h1 className="font-display text-base font-bold text-text-primary">{title}</h1>
      </div>

      {/* Top section: card slot + instruction */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">

        {/* Card slot */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase === 'selecting' ? 'empty' : 'filled'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <SlotCard phase={phase} card={card} />
          </motion.div>
        </AnimatePresence>

        {/* Instruction / CTA */}
        <AnimatePresence mode="wait">
          {phase === 'selecting' && (
            <motion.div
              key="instruction"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-1 px-6"
            >
              <p className="text-sm text-white/50 leading-relaxed">{promptText}</p>
            </motion.div>
          )}
          {phase === 'selected' && (
            <motion.div
              key="open-cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={handleOpenCard}
                className="px-10 py-3.5 rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(90deg, #2dd4bf, #0ea5e9)', boxShadow: '0 0 20px rgba(45,212,191,0.35)' }}
              >
                Open the card
              </button>
            </motion.div>
          )}
          {(phase === 'opening' || phase === 'reading') && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-xs text-white/30">Your reading is ready</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom fan */}
      <div className="shrink-0 pb-2">
        {/* "Choose the card" label */}
        <p className="text-center text-[11px] text-white/35 mb-3 tracking-wide">
          ← Choose the card →
        </p>

        {/* Fan container — overflow visible so cards bleed off edges */}
        <div
          className="relative flex items-end justify-center"
          style={{ height: 140, overflow: 'visible' }}
        >
          {fanPositions.map((pos, i) => {
            const isPicked = selectedIndex === i
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: '50%',
                  bottom: 0,
                  marginLeft: -33,   // half of card width 66px
                  zIndex: isPicked ? 0 : i,
                  transformOrigin: 'bottom center',
                }}
                initial={{ x: pos.x, y: pos.y, rotate: pos.rotate }}
                animate={{
                  x: pos.x,
                  y: isPicked ? pos.y - 20 : (phase !== 'selecting' ? pos.y + 30 : pos.y),
                  rotate: isPicked ? 0 : pos.rotate,
                  opacity: isPicked ? 0 : (phase !== 'selecting' ? 0.25 : 1),
                  scale: isPicked ? 0 : 1,
                }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <FanCard
                  onClick={() => handleCardSelect(i)}
                  disabled={phase !== 'selecting'}
                />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Reveal sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={handleReset}
        title={card?.name ?? 'Your Card'}
      >
        {card && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center rounded-2xl p-4"
              style={{ background: `${card.color}10`, border: `1px solid ${card.color}20` }}
            >
              <div className="relative shrink-0 rounded-xl overflow-hidden" style={{ width: 60, height: 94 }}>
                <Image src={CARD_DEFAULT_SRC} alt={card.name} fill className="object-cover" sizes="60px" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,14,28,0.7) 30%, transparent 100%)' }} />
              </div>
              <div className="text-left">
                <p className="font-mystical text-lg leading-tight" style={{ color: card.color }}>{card.name}</p>
                <p className="text-[10px] text-text-muted mt-1">
                  {card.arcana === 'major' ? 'Major' : 'Minor'} Arcana · {card.number}
                  {card.suit && ` · ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest mb-1">Meaning</p>
                <p className="text-sm text-text-secondary leading-relaxed">{card.uprightMeaning}</p>
              </div>
              {card.tipOfDay && (
                <div>
                  <p className="text-[10px] font-display font-semibold text-teal-400 uppercase tracking-widest mb-1">Guidance for You</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{card.tipOfDay}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
