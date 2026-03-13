import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  children: React.ReactNode
}

const variantMap: Record<Variant, string> = {
  primary: `
    bg-cyan-glow text-midnight-950 font-semibold
    shadow-[0_4px_15px_rgba(6,182,212,0.35)]
    hover:bg-[#0ea5ce] active:scale-[0.97]
    disabled:opacity-50
  `,
  secondary: `
    bg-lime-accent text-midnight-950 font-semibold
    shadow-[0_4px_15px_rgba(132,204,22,0.25)]
    hover:bg-[#78b512] active:scale-[0.97]
    disabled:opacity-50
  `,
  ghost: `
    border border-white/15 text-text-primary font-medium
    hover:bg-white/[0.06] active:scale-[0.97]
    disabled:opacity-50
  `,
  danger: `
    bg-rose-accent text-white font-semibold
    hover:bg-[#e11d48] active:scale-[0.97]
    disabled:opacity-50
  `,
}

const sizeMap: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm rounded-full',
  md: 'h-[52px] px-6 text-base rounded-full',
  lg: 'h-14 px-8 text-lg rounded-full',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed',
        'font-display transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/60',
        variantMap[variant],
        sizeMap[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}
