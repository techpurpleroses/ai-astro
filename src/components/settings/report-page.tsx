'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { REPORT_DETAILS, REPORT_PRODUCTS } from '@/data/reports'

interface ReportPageClientProps {
  slug: string
}

export function ReportPageClient({ slug }: ReportPageClientProps) {
  const router = useRouter()
  const report = REPORT_DETAILS[slug]
  const product = REPORT_PRODUCTS.find((item) => item.id === slug)

  if (!report) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm text-text-secondary">Report not found.</p>
      </div>
    )
  }

  const heroImage = product?.icon ?? '/assets/features/horoscope.png'
  const accent = product?.accent ?? '#22D3EE'

  return (
    <div className="flex flex-col">
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
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">REPORT</p>
          <h1 className="font-display text-base font-bold text-text-primary">{report.title}</h1>
        </div>
      </div>

      <article className="px-4 pt-4 pb-8 space-y-4">
        <section
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(34,211,238,0.08), rgba(15,30,53,0.92))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="relative h-56">
            <Image src={heroImage} alt={report.title} fill className="object-cover" />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.68))',
              }}
            />
            <div className="absolute inset-x-0 bottom-4 px-4 text-center">
              <h2 className="font-mystical text-3xl leading-tight text-[#F4E2B4]">{report.title}</h2>
              <p className="text-sm text-text-secondary">{report.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          {report.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-3 text-center"
              style={{
                background: 'rgba(15,30,53,0.82)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider text-text-muted">{stat.label}</p>
              <p className="font-display text-sm font-bold mt-1" style={{ color: accent }}>
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {report.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(15,30,53,0.82)',
              border: `1px solid ${accent}35`,
            }}
          >
            <h3 className="font-display text-sm font-bold mb-2" style={{ color: accent }}>
              {section.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">{section.body}</p>
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="text-xs text-text-secondary flex items-start gap-2">
                    <span style={{ color: accent }}>•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  )
}

