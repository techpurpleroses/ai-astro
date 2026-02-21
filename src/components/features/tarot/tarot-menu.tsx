'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Sun, Clock, Heart, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const TAROT_OPTIONS = [
  {
    id: 'card-of-the-day',
    title: 'Card of the Day',
    description: 'Pull your daily guidance card',
    icon: <Sun size={20} className="text-gold-accent" />,
    color: '#F59E0B',
  },
  {
    id: 'near-future',
    title: 'Near Future',
    description: 'What\'s coming in the next 3 months',
    icon: <Clock size={20} className="text-violet-400" />,
    color: '#A78BFA',
  },
  {
    id: 'love',
    title: 'Love & Relationships',
    description: 'Insights into your heart and connections',
    icon: <Heart size={20} className="text-rose-accent" />,
    color: '#F43F5E',
  },
  {
    id: 'yes-no',
    title: 'Yes or No',
    description: 'Get a direct answer to your question',
    icon: <HelpCircle size={20} className="text-cyan-glow" />,
    color: '#06B6D4',
  },
]

export function TarotMenuClient() {
  const router = useRouter()

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(10,22,40,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">FEATURES</p>
          <h1 className="font-display text-base font-bold text-text-primary">Tarot</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {/* Intro */}
        <div
          className="rounded-2xl px-4 py-4 text-center"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}
        >
          <p className="font-mystical text-xs text-violet-300 tracking-wider mb-1">✦ The Cards Await ✦</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Choose your reading type. Focus your intention, clear your mind, and let the universe speak through the cards.
          </p>
        </div>

        {/* Options */}
        {TAROT_OPTIONS.map((opt, i) => (
          <motion.button
            key={opt.id}
            onClick={() => router.push(`/features/tarot/${opt.id}`)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left"
            style={{ borderColor: `${opt.color}25` }}
          >
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${opt.color}12`, border: `1px solid ${opt.color}25` }}
            >
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-text-primary">{opt.title}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{opt.description}</p>
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  )
}
