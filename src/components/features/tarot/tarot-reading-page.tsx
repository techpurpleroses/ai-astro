'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'

// ── Mock tarot cards data ─────────────────────────────────────────────────────

const TAROT_CARDS = [
  { id: 'the-fool',       name: 'The Fool',       number: 0,  arcana: 'Major', meaning: 'New beginnings, spontaneity, a free spirit. The Fool invites you to leap into the unknown with childlike wonder and trust.', advice: 'Take that leap you\'ve been hesitating over. The universe supports bold new beginnings.', color: '#F59E0B' },
  { id: 'the-magician',   name: 'The Magician',   number: 1,  arcana: 'Major', meaning: 'Willpower, desire, creation, manifestation. You have everything you need to make your vision real.', advice: 'Channel your focus. All the tools are in your hands — it\'s time to create magic.', color: '#06B6D4' },
  { id: 'high-priestess', name: 'High Priestess', number: 2,  arcana: 'Major', meaning: 'Intuition, sacred knowledge, the unconscious. Trust the quiet voice within that knows far more than logic can explain.', advice: 'Pause and listen to your inner wisdom before taking action.', color: '#A78BFA' },
  { id: 'the-empress',    name: 'The Empress',    number: 3,  arcana: 'Major', meaning: 'Femininity, beauty, nature, nurturing, abundance. A time of growth, creativity, and flourishing in all areas.', advice: 'Nurture your creative projects. Abundance is flowing toward you.', color: '#84CC16' },
  { id: 'the-star',       name: 'The Star',       number: 17, arcana: 'Major', meaning: 'Hope, faith, purpose, renewal, spirituality. After difficulty comes a time of healing and inspiration.', advice: 'Trust the path unfolding before you. The stars are aligning in your favor.', color: '#06B6D4' },
  { id: 'the-moon',       name: 'The Moon',       number: 18, arcana: 'Major', meaning: 'Illusion, fear, the unconscious, uncertainty. Things are not as they appear — trust your instincts over appearances.', advice: 'Navigate by feeling rather than fact. Your intuition will guide you through the fog.', color: '#94A3B8' },
  { id: 'the-sun',        name: 'The Sun',        number: 19, arcana: 'Major', meaning: 'Joy, success, positivity, vitality, warmth. A period of clarity, celebration, and life-affirming energy.', advice: 'Step into the light. This is a time to celebrate, shine, and share your gifts.', color: '#F59E0B' },
  { id: 'judgement',      name: 'Judgement',      number: 20, arcana: 'Major', meaning: 'Reflection, reckoning, awakening, absolution. A powerful call to rise — you are being called to a higher version of yourself.', advice: 'Listen to your calling. A transformation is occurring that cannot be undone.', color: '#EF4444' },
]

interface TarotReadingProps {
  title: string
  subtitle: string
  promptText: string
  accentColor: string
}

// ── Card back component ───────────────────────────────────────────────────────

function CardBack({ color }: { color: string }) {
  return (
    <div
      className="w-full h-full rounded-2xl flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${color}20, rgba(15,30,53,0.9))`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}
        >
          ✦
        </div>
        <p className="font-mystical text-[10px] tracking-widest" style={{ color }}>
          SELECT A CARD
        </p>
      </div>
    </div>
  )
}

// ── Card front ────────────────────────────────────────────────────────────────

function CardFront({ card }: { card: typeof TAROT_CARDS[0] }) {
  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col items-center justify-center p-4 gap-3"
      style={{
        background: `linear-gradient(160deg, ${card.color}25 0%, rgba(10,22,40,0.95) 60%)`,
        border: `1px solid ${card.color}40`,
        boxShadow: `0 0 30px ${card.color}20`,
      }}
    >
      <div
        className="h-16 w-16 rounded-full flex items-center justify-center text-4xl"
        style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
      >
        ✦
      </div>
      <p className="font-mystical text-base text-center" style={{ color: card.color }}>
        {card.name}
      </p>
      <p className="text-[9px] font-display text-text-muted uppercase tracking-wider">
        {card.arcana} Arcana · {card.number}
      </p>
    </div>
  )
}

// ── Flip card ─────────────────────────────────────────────────────────────────

function FlipCard({
  card,
  isFlipped,
  onClick,
  accentColor,
}: {
  card: typeof TAROT_CARDS[0] | null
  isFlipped: boolean
  onClick: () => void
  accentColor: string
}) {
  return (
    <div
      className="w-[160px] h-[248px] cursor-pointer"
      style={{ perspective: 800 }}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Back face */}
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          <CardBack color={accentColor} />
        </div>
        {/* Front face */}
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {card ? <CardFront card={card} /> : <CardBack color={accentColor} />}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main reading page ─────────────────────────────────────────────────────────

export function TarotReadingPage({ title, subtitle, promptText, accentColor }: TarotReadingProps) {
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const card = selectedIndex !== null ? TAROT_CARDS[selectedIndex % TAROT_CARDS.length] : null

  const handleCardSelect = (index: number) => {
    if (selectedIndex !== null) return // already selected
    setSelectedIndex(index)
    setTimeout(() => {
      setIsFlipped(true)
      setTimeout(() => setSheetOpen(true), 700)
    }, 100)
  }

  // 7 cards spread in a wide individual-positioned arc (not shared pivot)
  const CARD_COUNT = 7
  const SPREAD_WIDTH = 290  // total horizontal spread in px
  const CARD_W = 78
  const CARD_H = 124

  // Each card gets its own x,y,rotation — cards are physically separated
  const cardPositions = Array.from({ length: CARD_COUNT }, (_, i) => {
    const t = i / (CARD_COUNT - 1)        // 0 → 1
    const norm = t * 2 - 1                 // -1 → +1
    const x = norm * (SPREAD_WIDTH / 2)   // -145 → +145 px
    const y = norm * norm * 22            // parabola: 0 at center, 22px up at edges
    const rotate = norm * 16             // -16° → +16°
    return { x, y, rotate }
  })

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">TAROT</p>
          <h1 className="font-display text-base font-bold text-text-primary">{title}</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-6 gap-8">
        {/* Prompt */}
        <div className="text-center space-y-2">
          <p className="font-mystical text-xs tracking-widest" style={{ color: accentColor }}>
            {subtitle}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed max-w-[260px]">
            {promptText}
          </p>
        </div>

        {/* Card fan — each card positioned independently for clear separation */}
        <div className="relative w-full flex items-center justify-center" style={{ height: 200 }}>
          {cardPositions.map((pos, i) => {
            const isSelected = selectedIndex === i
            const isOther = selectedIndex !== null && !isSelected

            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -(CARD_W / 2),
                  marginTop: -(CARD_H / 2),
                  zIndex: isSelected ? 20 : i,
                }}
                initial={{ x: pos.x, y: pos.y, rotate: pos.rotate }}
                animate={
                  isSelected
                    ? { x: 0, y: -18, rotate: 0, scale: 1.06, opacity: 1 }
                    : {
                        x: pos.x,
                        y: isOther ? pos.y + 6 : pos.y,
                        rotate: pos.rotate,
                        scale: isOther ? 0.93 : 1,
                        opacity: isOther ? 0.38 : 1,
                      }
                }
                transition={{ duration: 0.38, ease: 'easeOut' }}
              >
                {isSelected ? (
                  <FlipCard
                    card={card}
                    isFlipped={isFlipped}
                    onClick={() => {}}
                    accentColor={accentColor}
                  />
                ) : (
                  <motion.button
                    onClick={() => handleCardSelect(i)}
                    whileHover={{ y: -8, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="rounded-2xl cursor-pointer focus:outline-none"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      background: `linear-gradient(160deg, ${accentColor}28 0%, rgba(12,24,48,0.92) 100%)`,
                      border: `1px solid ${accentColor}35`,
                      boxShadow: `0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    }}
                  >
                    {/* Card back pattern */}
                    <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                      {/* Decorative border inset */}
                      <div className="absolute inset-[5px] rounded-xl opacity-25"
                        style={{ border: `1px solid ${accentColor}` }}
                      />
                      <span className="text-base opacity-60" style={{ color: accentColor }}>✦</span>
                    </div>
                  </motion.button>
                )}
              </motion.div>
            )
          })}
        </div>

        {selectedIndex === null && (
          <p className="text-[11px] text-text-muted font-display text-center animate-pulse">
            Tap any card to reveal your reading
          </p>
        )}
      </div>

      {/* Reveal sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setIsFlipped(false); setSelectedIndex(null) }}
        title={card?.name ?? 'Your Card'}
      >
        {card && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: `${card.color}10`, border: `1px solid ${card.color}20` }}
            >
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
                style={{ background: `${card.color}15`, border: `1px solid ${card.color}30` }}
              >
                ✦
              </div>
              <p className="font-mystical text-lg" style={{ color: card.color }}>{card.name}</p>
              <p className="text-[10px] text-text-muted mt-1">{card.arcana} Arcana · {card.number}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest mb-1">Meaning</p>
                <p className="text-sm text-text-secondary leading-relaxed">{card.meaning}</p>
              </div>
              <div>
                <p className="text-[10px] font-display font-semibold text-lime-accent uppercase tracking-widest mb-1">Guidance for You</p>
                <p className="text-sm text-text-secondary leading-relaxed">{card.advice}</p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
