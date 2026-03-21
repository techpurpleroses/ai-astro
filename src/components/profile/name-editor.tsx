'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { astroFetchJson } from '@/lib/client/astro-fetch'

interface ProfileData {
  displayName: string | null
}

export function NameEditor() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () =>
      astroFetchJson('/api/dashboard/profile', { debugOrigin: 'components.profile.name' }),
    staleTime: 60_000,
  })

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill once data loads
  useEffect(() => {
    if (profile?.displayName && !name) {
      setName(profile.displayName)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.displayName])

  async function handleSave() {
    if (saving || name.trim().length < 1) return
    setSaving(true)
    setError(null)
    try {
      await astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.name.save',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
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
        <h1 className="font-mystical text-2xl text-[#F4E2B4] flex-1 text-center mr-8">Name</h1>
      </div>

      <div className="px-5 pt-8 flex flex-col gap-4">
        <p className="text-sm text-text-muted">It will help us compile your personal horoscope</p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl px-4 py-3.5 text-base text-text-primary outline-none focus:ring-1 focus:ring-cyan-400"
          style={{
            background: 'rgba(14,27,49,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Save button — pinned to bottom */}
      <div className="mt-auto px-5 pb-10 pt-6">
        <button
          onClick={() => { void handleSave() }}
          disabled={saving || name.trim().length < 1}
          className="w-full py-3.5 rounded-full text-base font-semibold text-[#061327] disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #22d3ee, #2dd4bf)' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
