'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Globe, LogOut, Shield, CreditCard, HelpCircle, FileText } from 'lucide-react'
import { ReportsFromAdvisors } from '@/components/reports/reports-from-advisors'
import { SETTINGS_BENEFITS } from '@/data/reports'

function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string
}) {
  return (
    <button
      className="w-full rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors active:bg-white/10"
      style={{
        background: 'rgba(15,30,53,0.82)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-midnight-700/80 border border-white/10">
        {icon}
      </div>
      <span className="font-display text-base font-semibold text-text-primary flex-1">{label}</span>
      {value && <span className="text-sm text-text-secondary">{value}</span>}
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  )
}

export function SettingsClient() {
  const router = useRouter()

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
        <div className="flex items-center gap-2">
          <Image src="/assets/settings.png" alt="Settings" width={16} height={16} />
          <h1 className="font-mystical text-2xl text-[#F4E2B4] leading-none">Settings</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        <section
          className="rounded-2xl p-4 space-y-2"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(15,30,53,0.9))',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <h2 className="font-mystical text-3xl leading-none text-[#F4E2B4]">Your Benefits</h2>
          <ul className="space-y-1.5 pt-1">
            {SETTINGS_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{benefit}</span>
                <span className="text-lime-accent">✓</span>
              </li>
            ))}
          </ul>
        </section>

        <ReportsFromAdvisors onOpenReport={(id) => router.push(`/settings/reports/${id}`)} />

        <div className="space-y-2">
          <SettingsRow icon={<Globe size={16} className="text-text-secondary" />} label="Language" value="English" />
          <SettingsRow icon={<Shield size={16} className="text-text-secondary" />} label="Privacy Policy" />
          <SettingsRow icon={<FileText size={16} className="text-text-secondary" />} label="Terms of Service" />
          <SettingsRow icon={<HelpCircle size={16} className="text-text-secondary" />} label="Help Center" />
        </div>

        <button
          className="w-full rounded-xl px-4 py-3.5 text-left"
          style={{
            background: 'rgba(15,30,53,0.82)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="font-display text-xl font-semibold text-text-primary text-center">Log out</div>
          <div className="text-xs text-text-muted text-center">darshanranade36@gmail.com</div>
        </button>

        <SettingsRow icon={<CreditCard size={16} className="text-text-secondary" />} label="Payment Methods" />
        <div className="h-2" />
      </div>
    </div>
  )
}

