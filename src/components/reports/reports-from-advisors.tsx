'use client'

import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { REPORT_PRODUCTS } from '@/data/reports'
import { cn } from '@/lib/utils'

interface ReportsFromAdvisorsProps {
  className?: string
  onOpenReport: (id: string) => void
  title?: string
  compact?: boolean
}

export function ReportsFromAdvisors({
  className,
  onOpenReport,
  title = 'Reports from Advisors',
  compact = false,
}: ReportsFromAdvisorsProps) {
  return (
    <section
      className={cn(
        'rounded-3xl p-4 glass-card',
        compact ? 'space-y-2.5' : 'space-y-3',
        className,
      )}
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
        {title}
      </h3>

      <div className={cn(compact ? 'space-y-2' : 'space-y-2.5')}>
        {REPORT_PRODUCTS.map((report) => (
          <button
            key={report.id}
            onClick={() => onOpenReport(report.id)}
            className={cn(
              'w-full rounded-2xl px-3 py-2.5 text-left',
              'flex items-center gap-2.5',
              'transition-colors active:bg-white/10',
            )}
            style={{
              background: 'rgba(15,30,53,0.86)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-midnight-700/60">
              <Image src={report.icon} alt={report.title} width={44} height={44} className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-text-primary truncate">{report.title}</p>
            </div>

            {report.status === 'buy' ? (
              <span
                className="shrink-0 rounded-xl px-4 py-1.5 text-sm font-display font-bold text-midnight-950"
                style={{ background: 'linear-gradient(135deg, #84CC16, #65A30D)' }}
              >
                Get
              </span>
            ) : (
              <div className="shrink-0 flex items-center gap-2">
                {report.badge && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-display font-bold text-midnight-950"
                    style={{ background: 'linear-gradient(135deg, #22D3EE, #A78BFA)' }}
                  >
                    {report.badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-text-secondary" />
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-text-muted leading-snug">
        By clicking Get you confirm purchase via your stored billing details.
      </p>
    </section>
  )
}
