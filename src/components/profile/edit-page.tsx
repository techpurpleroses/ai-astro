'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { astroFetchJson, astroFetch } from '@/lib/client/astro-fetch'

interface ProfileData {
  displayName: string | null
  gender: string | null
  relationshipStatus: string | null
  birthDate: string | null
  birthTime: string | null
  birthPlaceName: string | null
}

function formatDate(d: string | null) {
  if (!d) return '—'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function EditRow({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href: string
}) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(href)}
      className="w-full rounded-2xl px-4 py-4 text-left flex items-center justify-between active:opacity-70 transition-opacity"
      style={{
        background: 'rgba(14,27,49,0.85)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div>
        <p className="text-xs text-text-muted mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
      </div>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  )
}

export function EditProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () =>
      astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.edit',
      }),
    staleTime: 60_000,
  })

  const displayName = profile?.displayName ?? 'You'
  const gender = profile?.gender ? capitalize(profile.gender.replace('_', '-')) : '—'
  const relationship = profile?.relationshipStatus ? capitalize(profile.relationshipStatus) : '—'
  const birthDate = formatDate(profile?.birthDate ?? null)
  const birthTime = formatTime(profile?.birthTime ?? null)
  const birthPlace = profile?.birthPlaceName ?? '—'

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    try {
      await astroFetch('/api/auth/logout', {
        debugOrigin: 'components.profile.delete',
        method: 'POST',
      })
      queryClient.clear()
      router.replace('/auth/login')
      router.refresh()
    } finally {
      setDeleting(false)
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
        <h1 className="font-mystical text-2xl text-[#F4E2B4] flex-1 text-center mr-8">Edit</h1>
      </div>

      <div className="px-4 pt-5 pb-10 flex flex-col gap-3">
        <EditRow label="Name"          value={displayName} href="/settings/profile/edit/name" />
        <EditRow label="Gender"        value={gender}      href="/settings/profile/edit/gender" />
        <EditRow label="Relationship"  value={relationship} href="/settings/profile/edit/relationship" />
        <EditRow label="Date of birth" value={birthDate}   href="/settings/profile/edit/birth-date" />
        <EditRow label="Place of birth" value={birthPlace} href="/settings/profile/edit/birth-place" />
        <EditRow label="Time of birth" value={birthTime}   href="/settings/profile/edit/birth-time" />

        {/* Spacer */}
        <div className="flex-1 min-h-[40px]" />

        {/* Delete button */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-4 text-center text-sm font-semibold text-red-400 active:text-red-300 transition-colors"
          >
            Delete Data &amp; Account
          </button>
        ) : (
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <p className="text-sm text-red-300 text-center">
              Are you sure? This will log you out. Contact support to permanently delete your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-text-secondary"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleDeleteAccount() }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(239,68,68,0.7)' }}
              >
                <Trash2 size={14} />
                {deleting ? 'Please wait...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
