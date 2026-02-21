import { moonPhaseClipPath } from '@/lib/moon-phase-math'

interface MoonPhaseDisplayProps {
  illumination: number
  isWaxing: boolean
  size?: number
  className?: string
}

export function MoonPhaseDisplay({
  illumination,
  isWaxing,
  size = 96,
  className,
}: MoonPhaseDisplayProps) {
  const r = size / 2 - 4
  const cx = size / 2
  const cy = size / 2

  const litPath = moonPhaseClipPath(illumination, isWaxing, r)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="moon-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <radialGradient id="moon-dark-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#2a3a5a" stopOpacity="1" />
          <stop offset="100%" stopColor="#0d1b2e" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="moon-lit-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#e8e4d4" stopOpacity="1" />
          <stop offset="60%"  stopColor="#c8c0a8" stopOpacity="1" />
          <stop offset="100%" stopColor="#9aa0b8" stopOpacity="1" />
        </radialGradient>
        <filter id="moon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Shadow side (dark face) */}
      <circle cx={cx} cy={cy} r={r} fill="url(#moon-dark-grad)" />

      {/* Craters on dark side */}
      <circle cx={cx * 0.75} cy={cy * 1.3} r={r * 0.06} fill="rgba(0,0,0,0.15)" />
      <circle cx={cx * 1.15} cy={cy * 0.7} r={r * 0.04} fill="rgba(0,0,0,0.12)" />

      {/* Illuminated portion using clip */}
      <g clipPath="url(#moon-clip)">
        <g transform={`translate(${cx}, ${cy})`}>
          {/* Full circle lit face */}
          <circle cx={0} cy={0} r={r} fill="url(#moon-lit-grad)" />

          {/* Craters on lit side */}
          <circle cx={r * -0.2}  cy={r * 0.3} r={r * 0.07} fill="rgba(0,0,0,0.08)" />
          <circle cx={r * 0.15}  cy={r * -0.2} r={r * 0.05} fill="rgba(0,0,0,0.06)" />
          <circle cx={r * -0.35} cy={r * -0.3} r={r * 0.04} fill="rgba(0,0,0,0.07)" />

          {/* The actual phase shape — masks over to dark */}
          <path
            d={litPath}
            fill="url(#moon-dark-grad)"
            transform={isWaxing ? 'scale(1,1)' : 'scale(-1,1)'}
          />
        </g>
      </g>

      {/* Outer glow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 2}
        fill="none"
        stroke="rgba(148,163,184,0.2)"
        strokeWidth="1.5"
      />

      {/* Bright limb highlight */}
      {illumination > 10 && (
        <ellipse
          cx={isWaxing ? cx + r * 0.7 : cx - r * 0.7}
          cy={cy}
          rx={r * 0.12}
          ry={r * 0.75}
          fill="rgba(255,255,255,0.06)"
        />
      )}
    </svg>
  )
}
