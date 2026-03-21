'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { astroFetchJson } from '@/lib/client/astro-fetch'

const GENDERS = [
  {
    value: 'female',
    label: 'Female',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="18" r="10" stroke="currentColor" strokeWidth="2.5" />
        <line x1="22" y1="28" x2="22" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="15" y1="35" x2="29" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'male',
    label: 'Male',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="18" cy="24" r="10" stroke="currentColor" strokeWidth="2.5" />
        <line x1="25.5" y1="9.5" x2="38" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="30" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="6" x2="38" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'non_binary',
    label: 'Non-binary',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="18" r="10" stroke="currentColor" strokeWidth="2.5" />
        <line x1="22" y1="28" x2="22" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="33" x2="28" y2="33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="38" x2="28" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

interface ProfileData {
  gender: string | null
}

export function GenderPicker() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () =>
      astroFetchJson('/api/dashboard/profile', { debugOrigin: 'components.profile.gender' }),
    staleTime: 60_000,
  })

  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const current = selected ?? profile?.gender ?? null

  async function handleSelect(value: string) {
    if (saving) return
    setSelected(value)
    setSaving(true)
    try {
      await astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.gender.save',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: value }),
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      router.back()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center"
        style={{
          background: 'rgba(10,22,40,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6 mr-3"
        >
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <h1 className="font-mystical text-2xl text-[#F4E2B4] flex-1 text-center mr-8">Gender</h1>
      </div>

      <div className="px-5 pt-8 flex flex-col gap-6">
        <p className="text-sm text-text-muted">
          It helps us get a better idea about your health and well-being, your love life and relationships
        </p>

        <div className="grid grid-cols-2 gap-4">
          {GENDERS.map((g) => {
            const isActive = current === g.value
            return (
              <button
                key={g.value}
                onClick={() => { void handleSelect(g.value) }}
                disabled={saving}
                className={cn(
                  'rounded-2xl py-8 flex flex-col items-center gap-3 transition-all active:scale-95',
                  g.value === 'non_binary' && 'col-span-2 max-w-[48%] mx-auto w-full'
                )}
                style={{
                  background: isActive
                    ? 'rgba(34,211,238,0.18)'
                    : 'rgba(14,27,49,0.85)',
                  border: isActive
                    ? '1.5px solid rgba(34,211,238,0.6)'
                    : '1px solid rgba(255,255,255,0.07)',
                  color: isActive ? '#22d3ee' : 'rgba(245,158,11,0.85)',
                }}
              >
                {g.icon}
                <span className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-cyan-300' : 'text-text-primary'
                )}>
                  {g.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
