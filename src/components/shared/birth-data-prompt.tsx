'use client'

import { useState, useEffect } from 'react'
import { Sparkles, MapPin } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { useUserProfile, useUpdateProfile } from '@/hooks/use-profile'

// ─────────────────────────────────────────────────────────────────────────────
// BirthDataPrompt
//
// Shown automatically to placeholder users (no real birth data).
// Collecting birth date unlocks personalized horoscopes, daily readings,
// and birth chart computation from the live provider.
// ─────────────────────────────────────────────────────────────────────────────

export function BirthDataPrompt() {
  const { data: profile } = useUserProfile()
  const { mutate: updateProfile, isPending, isSuccess, error } = useUpdateProfile()

  const [open, setOpen] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthTimezone, setBirthTimezone] = useState('')

  // Auto-detect browser timezone on mount
  useEffect(() => {
    try {
      setBirthTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setBirthTimezone('UTC')
    }
  }, [])

  // Open the sheet automatically once we know the user is a placeholder
  useEffect(() => {
    if (profile?.isPlaceholder) {
      setOpen(true)
    }
  }, [profile?.isPlaceholder])

  // Close on successful update
  useEffect(() => {
    if (isSuccess) {
      setOpen(false)
    }
  }, [isSuccess])

  if (!profile?.isPlaceholder) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!birthDate) return
    updateProfile({
      birthDate,
      birthTime: birthTime || undefined,
      birthTimezone: birthTimezone || 'UTC',
    })
  }

  return (
    <>
      {/* Persistent banner (visible when sheet is closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="mx-4 mb-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl px-4 py-3 text-left transition-opacity active:opacity-80"
          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)' }}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-cyan-300" />
          <div className="min-w-0">
            <p className="text-[13px] font-display font-semibold text-cyan-200">Unlock personalised readings</p>
            <p className="text-[11px] text-cyan-300/70 truncate">Tap to enter your birth date</p>
          </div>
        </button>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your Birth Details"
        showClose
      >
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <p className="text-sm text-text-secondary leading-relaxed">
            Enter your birth date to unlock your personalised daily horoscope, birth chart, and love readings powered by live planetary data.
          </p>

          {/* Birth date — required */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-display font-semibold uppercase tracking-widest text-text-secondary">
              Date of Birth <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          {/* Birth time — optional */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-display font-semibold uppercase tracking-widest text-text-secondary">
              Time of Birth <span className="text-text-secondary/50">(optional — improves accuracy)</span>
            </label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          {/* Birth timezone — pre-filled from browser */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-display font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              Birth Timezone
            </label>
            <input
              type="text"
              value={birthTimezone}
              onChange={(e) => setBirthTimezone(e.target.value)}
              placeholder="e.g. America/New_York"
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/40"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <p className="text-[10px] text-text-secondary/60">Auto-detected from your browser</p>
          </div>

          {error && (
            <p className="text-sm text-rose-400">{error.message}</p>
          )}

          <Button
            type="submit"
            fullWidth
            loading={isPending}
            disabled={!birthDate}
          >
            Save & Unlock Readings
          </Button>
        </form>
      </BottomSheet>
    </>
  )
}
