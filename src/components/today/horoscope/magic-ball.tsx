'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
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

  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const shimmerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !glowRef.current) return

    const ctx = gsap.context(() => {
      // Float animation
      gsap.to(containerRef.current, {
        y: -10,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      })

      // Glow pulse
      gsap.to(glowRef.current, {
        boxShadow:
          '0 0 50px rgba(6,182,212,0.65), 0 0 100px rgba(6,182,212,0.22), inset 0 0 40px rgba(6,182,212,0.1)',
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
      })

      // Shimmer rotation
      if (shimmerRef.current) {
        gsap.to(shimmerRef.current, {
          rotation: 360,
          duration: 12,
          repeat: -1,
          ease: 'none',
        })
      }
    }, containerRef)

    return () => ctx.revert()
  }, [])

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
      {/* Ball trigger */}
      <button
        onClick={() => setSheetOpen(true)}
        className="glass-card-interactive rounded-2xl p-4 flex flex-col items-center gap-3 w-full"
      >
        <span className="text-[10px] font-display font-semibold text-cyan-glow uppercase tracking-widest">
          Magic Ball
        </span>

        {/* Ball */}
        <div ref={containerRef} className="relative">
          {/* Outer glow ring */}
          <div
            ref={glowRef}
            className="h-16 w-16 rounded-full"
            style={{
              boxShadow:
                '0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.12), inset 0 0 30px rgba(6,182,212,0.06)',
            }}
          >
            {/* Sphere */}
            <div
              className="h-full w-full rounded-full overflow-hidden relative"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, rgba(6,182,212,0.5) 0%, rgba(15,30,80,0.9) 55%, rgba(10,22,40,1) 100%)',
              }}
            >
              {/* Shimmer overlay */}
              <div
                ref={shimmerRef}
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent, rgba(6,182,212,0.15), transparent)',
                }}
              />
              {/* Reflection highlight */}
              <div
                className="absolute top-[15%] left-[20%] h-[20%] w-[25%] rounded-full opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent)' }}
              />
              {/* Center symbol */}
              <div className="absolute inset-0 flex items-center justify-center text-xl opacity-70">
                🔮
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          Ask yes or no — tap to consult the cosmos
        </p>
      </button>

      {/* Sheet */}
      <BottomSheet open={sheetOpen} onClose={handleClose} title="Magic Ball">
        <div className="space-y-5">
          {/* Suggestions */}
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

          {/* Input */}
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

          {/* Answer */}
          {answer && (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.08), rgba(15,30,53,0.6))',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
            >
              <p className="font-mystical text-base text-text-primary leading-relaxed">
                "{answer}"
              </p>
            </div>
          )}

          <Button
            fullWidth
            onClick={handleReveal}
            loading={isRevealing}
            disabled={isRevealing}
          >
            {answer ? 'Ask Again' : 'Get the Answer'}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
