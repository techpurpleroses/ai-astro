'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { astroFetchJson } from '@/lib/client/astro-fetch'

const RELATIONSHIPS = [
  {
    value: 'single',
    label: 'Single',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="12" r="7" fill="currentColor" opacity="0.9" />
        <path d="M8 38c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    value: 'engaged',
    label: 'Engaged',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <path d="M14 22 l4 4 l8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 8 L26 16 H34 L28 22 L30 30 L22 26 L14 30 L16 22 L10 16 H18 Z"
          fill="currentColor" opacity="0.8" transform="scale(0.55) translate(19 8)" />
      </svg>
    ),
  },
  {
    value: 'married',
    label: 'Married',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="15" cy="11" r="6" fill="currentColor" opacity="0.9" />
        <circle cx="29" cy="11" r="6" fill="currentColor" opacity="0.9" />
        <path d="M4 36c0-6.627 4.925-12 11-12s11 5.373 11 12" fill="currentColor" opacity="0.7" />
        <path d="M18 36c0-6.627 4.925-12 11-12s11 5.373 11 12" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    value: 'soulmate',
    label: 'Soulmate',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M22 36 C22 36 6 26 6 16 C6 10 10.5 6 15 6 C18 6 20.5 7.5 22 10 C23.5 7.5 26 6 29 6 C33.5 6 38 10 38 16 C38 26 22 36 22 36Z"
          fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    value: 'difficult',
    label: 'Difficult',
    icon: (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M22 36 C22 36 6 26 6 16 C6 10 10.5 6 15 6 C18 6 20.5 7.5 22 10 C23.5 7.5 26 6 29 6 C33.5 6 38 10 38 16 C38 26 22 36 22 36Z"
          fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="14" y1="20" x2="30" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="30" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

interface ProfileData {
  relationshipStatus: string | null
}

export function RelationshipPicker() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () =>
      astroFetchJson('/api/dashboard/profile', { debugOrigin: 'components.profile.relationship' }),
    staleTime: 60_000,
  })

  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const current = selected ?? profile?.relationshipStatus ?? null

  async function handleSelect(value: string) {
    if (saving) return
    setSelected(value)
    setSaving(true)
    try {
      await astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.relationship.save',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationshipStatus: value }),
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
        <h1 className="font-mystical text-2xl text-[#F4E2B4] flex-1 text-center mr-8">Relationship</h1>
      </div>

      <div className="px-5 pt-8 flex flex-col gap-6">
        <p className="text-sm text-text-muted text-center">
          Pick your relationship status, so we can advise you about your love life
        </p>

        <div className="grid grid-cols-2 gap-4">
          {RELATIONSHIPS.map((r, i) => {
            const isActive = current === r.value
            const isLast = i === RELATIONSHIPS.length - 1
            const isOdd = RELATIONSHIPS.length % 2 !== 0

            return (
              <button
                key={r.value}
                onClick={() => { void handleSelect(r.value) }}
                disabled={saving}
                className={cn(
                  'rounded-2xl py-8 flex flex-col items-center gap-3 transition-all active:scale-95',
                  isLast && isOdd && 'col-span-2 max-w-[48%] mx-auto w-full'
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
                {r.icon}
                <span className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-cyan-300' : 'text-text-primary'
                )}>
                  {r.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
