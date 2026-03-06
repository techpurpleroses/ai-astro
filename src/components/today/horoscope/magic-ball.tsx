'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import type { MagicBallData } from '@/types'

interface MagicBallProps {
  data: MagicBallData
}

export function MagicBall({ data }: MagicBallProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)

  function handleReveal() {
    if (!question.trim() && data.suggestedQuestions.length === 0) return
    setIsRevealing(true)

    setTimeout(() => {
      const random = data.answers[Math.floor(Math.random() * data.answers.length)]
      setAnswer(random.answer)
      setIsRevealing(false)
    }, 1200)
  }

  function handleClose() {
    setSheetOpen(false)
    setAnswer(null)
    setQuestion('')
  }

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="rounded-2xl overflow-hidden text-left relative h-[188px]"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,20,38,0.92)' }}
      >
        <div className="absolute inset-0">
          <Image src="/assets/today/horoscope/magic-ball.webp" alt="Magic ball" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06213a]/65 via-transparent to-[#08111f]" />
        </div>

        <div className="relative h-full px-3 pt-3 pb-2 flex flex-col">
          <p className="font-display text-[15px] font-bold leading-tight text-white">Magic Ball</p>
          <div className="flex-1" />
          <div
            className="rounded-xl py-2 text-center text-xs font-display font-semibold text-[#E2E8F0]"
            style={{ background: 'linear-gradient(180deg, rgba(71,85,105,0.7), rgba(51,65,85,0.9))' }}
          >
            Get the Answer
          </div>
        </div>
      </button>

      <BottomSheet open={sheetOpen} onClose={handleClose} title="Magic Ball">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-display text-text-muted uppercase tracking-widest mb-2">
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {data.suggestedQuestions.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="rounded-full bg-midnight-700/60 border border-white/8 px-3 py-1.5 text-xs text-text-secondary active:border-cyan-glow/30 active:text-cyan-glow transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value)
                setAnswer(null)
              }}
              placeholder="Type your yes/no question..."
              className="w-full rounded-xl bg-midnight-700/60 border border-white/10 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-glow/40 transition-colors"
            />
          </div>

          {answer && (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.08), rgba(15,30,53,0.6))',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
            >
              <p className="font-mystical text-base text-text-primary leading-relaxed">
                &quot;{answer}&quot;
              </p>
            </div>
          )}

          <Button fullWidth onClick={handleReveal} loading={isRevealing} disabled={isRevealing}>
            {answer ? 'Ask Again' : 'Get the Answer'}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
