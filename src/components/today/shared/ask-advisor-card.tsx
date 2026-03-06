'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AskAdvisorCardProps {
  className?: string
}

export function AskAdvisorCard({ className }: AskAdvisorCardProps) {
  const router = useRouter()

  return (
    <div className={cn('px-4', className)}>
      <div
        className="relative overflow-hidden rounded-2xl p-3.5"
        style={{ background: 'rgba(4, 19, 35, 0.92)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#041727]/20 to-[#041727]/70" />

        <div className="relative">
          <p className="font-display text-[16px] font-semibold text-white">Have any questions?</p>

          <div className="mt-2.5 flex items-center gap-3">
            <div className="relative h-10 w-[58px] shrink-0">
              <div className="absolute left-0 top-0 h-10 w-10 overflow-hidden rounded-full border border-white/25 bg-midnight-700">
                <Image src="/assets/advisors/advisor-1.png" alt="Advisor" fill className="object-cover" sizes="40px" />
              </div>
              <div className="absolute left-[20px] top-[8px] h-10 w-10 overflow-hidden rounded-full border border-white/25 bg-midnight-800">
                <Image src="/assets/advisors/advisor-1.png" alt="Advisor" fill className="object-cover opacity-90" sizes="40px" />
              </div>
            </div>

            <p className="max-w-[190px] text-[15px] font-display leading-snug text-[#C6D3DF]">
              Get more insights! Ask an Advisor <span className="text-[#F4B01E]">✶</span>
            </p>
          </div>

          <button
            onClick={() => router.push('/advisors')}
            className="mt-3 h-10 w-full rounded-2xl text-sm font-display font-semibold text-white"
            style={{ background: 'linear-gradient(180deg, rgba(88,103,118,0.95), rgba(53,66,80,0.95))' }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}
