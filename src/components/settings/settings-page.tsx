'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Globe, LogOut, Shield, CreditCard, HelpCircle, FileText, Zap, Crown, Coins } from 'lucide-react'
import { ReportsFromAdvisors } from '@/components/reports/reports-from-advisors'
import { astroFetch } from '@/lib/client/astro-fetch'
import { useQueryClient } from '@tanstack/react-query'

const PLAN_BENEFITS: Record<string, string[]> = {
  free: [
    'Daily sign horoscope',
    'Moon phase & events',
    'Big Three birth chart',
    'Tarot card of the day',
    'Magic ball',
    'Story articles',
  ],
  pro: [
    'Full personalized horoscope + transits',
    'Complete birth chart',
    'Palm reading (3/month)',
    'All tarot modes',
    'Soulmate sketch (1/month)',
    'Deep compatibility (3/month)',
  ],
  premium: [
    'Everything in Pro',
    '50 advisor credits/month included',
    'Unlimited palm & soulmate',
    'Priority generation',
  ],
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: null,
  pro: <Zap size={13} className="text-cyan-400" />,
  premium: <Crown size={13} className="text-amber-400" />,
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
}

function SettingsRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
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

export function SettingsClient({
  userEmail,
  activePlanCode = 'free',
  creditBalance = 0,
}: {
  userEmail: string | null
  activePlanCode?: string
  creditBalance?: number
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await astroFetch('/api/auth/logout', {
        debugOrigin: 'components.settings.logout',
        method: 'POST',
      })
      queryClient.clear()
      router.replace('/auth/login')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

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
          <div className="flex items-center justify-between">
            <h2 className="font-mystical text-3xl leading-none text-[#F4E2B4]">Your Benefits</h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              {PLAN_ICONS[activePlanCode]}
              <span className="text-xs font-bold text-amber-300">
                {PLAN_LABELS[activePlanCode] ?? 'Free'}
              </span>
            </div>
          </div>
          {creditBalance > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-300/80">
              <Coins size={11} />
              <span>{creditBalance} advisor credits available</span>
            </div>
          )}
          <ul className="space-y-1.5 pt-1">
            {(PLAN_BENEFITS[activePlanCode] ?? PLAN_BENEFITS.free).map((benefit) => (
              <li key={benefit} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{benefit}</span>
                <span className="text-lime-accent">✓</span>
              </li>
            ))}
          </ul>
          {activePlanCode === 'free' && (
            <button
              onClick={() => router.push('/settings/billing')}
              className="mt-2 w-full text-center text-xs font-bold py-2 rounded-lg"
              style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}
            >
              Upgrade to Pro →
            </button>
          )}
        </section>

        <ReportsFromAdvisors onOpenReport={(id) => router.push(`/settings/reports/${id}`)} />

        <div className="space-y-2">
          <SettingsRow icon={<Globe size={16} className="text-text-secondary" />} label="Language" value="English" />
          <SettingsRow icon={<Shield size={16} className="text-text-secondary" />} label="Privacy Policy" />
          <SettingsRow icon={<FileText size={16} className="text-text-secondary" />} label="Terms of Service" />
          <SettingsRow icon={<HelpCircle size={16} className="text-text-secondary" />} label="Help Center" />
        </div>

        <button
          onClick={() => {
            void handleLogout()
          }}
          disabled={loggingOut}
          className="w-full rounded-xl px-4 py-3.5 text-left"
          style={{
            background: 'rgba(15,30,53,0.82)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="font-display text-xl font-semibold text-text-primary text-center flex items-center justify-center gap-2">
            <LogOut size={16} className="text-text-secondary" />
            <span>{loggingOut ? 'Logging out...' : 'Log out'}</span>
          </div>
          <div className="text-xs text-text-muted text-center">{userEmail ?? 'Signed in user'}</div>
        </button>

        <SettingsRow
          icon={<CreditCard size={16} className="text-text-secondary" />}
          label={activePlanCode !== 'free' ? 'Manage Subscription' : 'Upgrade Plan'}
          value={activePlanCode !== 'free' ? PLAN_LABELS[activePlanCode] : undefined}
          onClick={() => router.push('/settings/billing')}
        />
        <div className="h-2" />
      </div>
    </div>
  )
}
