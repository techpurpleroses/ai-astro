'use client'

const SIZE = 140
const CX = SIZE / 2
const CY = SIZE / 2
const R = 55
const CIRCUMFERENCE = 2 * Math.PI * R
const STROKE_WIDTH = 10

interface ScoreRingProps {
  score: number   // 0–100
  label: string
  color?: string
}

export function ScoreRing({ score, label, color = '#06B6D4' }: ScoreRingProps) {
  const progress = (score / 100) * CIRCUMFERENCE
  const dash = `${progress.toFixed(1)} ${(CIRCUMFERENCE - progress).toFixed(1)}`

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress arc */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={dash}
          strokeDashoffset={CIRCUMFERENCE / 4} /* start from top */
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        {/* Score text */}
        <text
          x={CX} y={CY - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={28}
          fontWeight={700}
          fontFamily="var(--font-space-grotesk), system-ui"
          fill="#F8FAFC"
        >
          {score}
        </text>
        <text
          x={CX} y={CY + 16}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-space-grotesk), system-ui"
          fill="#4E6179"
        >
          / 100
        </text>
      </svg>
      <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest">
        {label}
      </p>
    </div>
  )
}

interface CategoryBarProps {
  label: string
  score: number
  color: string
}

export function CategoryBar({ label, score, color }: CategoryBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-display font-semibold text-text-secondary w-16">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}50`,
          }}
        />
      </div>
      <span className="text-[10px] text-text-muted w-6 text-right">{score}</span>
    </div>
  )
}
