'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { astroFetchJson } from '@/lib/client/astro-fetch'

// ── Zodiac attribute lookup (derived from Sun Sign) ──────────────────────────

const ZODIAC_ATTRS: Record<string, {
  element: string
  planet: string
  polarity: string
  modality: string
}> = {
  aries:       { element: 'Fire',  planet: 'Mars',    polarity: 'Masculine', modality: 'Cardinal' },
  taurus:      { element: 'Earth', planet: 'Venus',   polarity: 'Feminine',  modality: 'Fixed'    },
  gemini:      { element: 'Air',   planet: 'Mercury', polarity: 'Masculine', modality: 'Mutable'  },
  cancer:      { element: 'Water', planet: 'Moon',    polarity: 'Feminine',  modality: 'Cardinal' },
  leo:         { element: 'Fire',  planet: 'Sun',     polarity: 'Masculine', modality: 'Fixed'    },
  virgo:       { element: 'Earth', planet: 'Mercury', polarity: 'Feminine',  modality: 'Mutable'  },
  libra:       { element: 'Air',   planet: 'Venus',   polarity: 'Masculine', modality: 'Cardinal' },
  scorpio:     { element: 'Water', planet: 'Mars',    polarity: 'Feminine',  modality: 'Fixed'    },
  sagittarius: { element: 'Fire',  planet: 'Jupiter', polarity: 'Masculine', modality: 'Mutable'  },
  capricorn:   { element: 'Earth', planet: 'Saturn',  polarity: 'Feminine',  modality: 'Cardinal' },
  aquarius:    { element: 'Air',   planet: 'Saturn',  polarity: 'Masculine', modality: 'Fixed'    },
  pisces:      { element: 'Water', planet: 'Jupiter', polarity: 'Feminine',  modality: 'Mutable'  },
}

// ── Tile icons (inline SVG symbols) ─────────────────────────────────────────

function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
        fill="rgba(245,158,11,0.9)" stroke="rgba(245,158,11,0.4)" strokeWidth="0.5" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.523 0 10-4.477 10-10 0-4.478-2.943-8.28-7-9.542C15 6 13 8 13 10c0-3-2-6-4-7-1 3-3 5-3 8a9 9 0 0 0 6 8.485z"
        fill="rgba(245,158,11,0.9)" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 19L19 5M19 5H9M19 5V15"
        stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlanetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" fill="rgba(245,158,11,0.9)" />
      <ellipse cx="12" cy="12" rx="11" ry="4"
        stroke="rgba(245,158,11,0.7)" strokeWidth="1.5" fill="none"
        transform="rotate(-25 12 12)" />
    </svg>
  )
}

function PolarityIcon({ polarity }: { polarity: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {polarity === 'Masculine' ? (
        <>
          <circle cx="10" cy="10" r="6" stroke="rgba(245,158,11,0.9)" strokeWidth="2" />
          <line x1="14.5" y1="5.5" x2="20" y2="0" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="0" x2="20" y2="0" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="0" x2="20" y2="4" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="12" cy="9" r="6" stroke="rgba(245,158,11,0.9)" strokeWidth="2" />
          <line x1="12" y1="15" x2="12" y2="22" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="19" x2="16" y2="19" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function ModalityIcon({ modality }: { modality: string }) {
  if (modality === 'Cardinal') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3L21 20H3L12 3Z" fill="rgba(245,158,11,0.85)" />
      </svg>
    )
  }
  if (modality === 'Fixed') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" fill="rgba(245,158,11,0.85)" />
      </svg>
    )
  }
  // Mutable
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C7 3 3 7 3 12s4 9 9 9" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M12 3C17 3 21 7 21 12s-4 9-9 9" stroke="rgba(245,158,11,0.6)" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="3 3" />
    </svg>
  )
}

// ── Zodiac orbital wheel ─────────────────────────────────────────────────────

function ZodiacWheel({ sign }: { sign: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Glow backdrop */}
      <div className="absolute inset-0 rounded-full" style={{
        background: 'radial-gradient(circle at center, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.06) 45%, transparent 70%)',
      }} />

      {/* Orbital rings SVG */}
      <svg className="absolute inset-0" width="200" height="200" viewBox="0 0 200 200" fill="none">
        {/* Outer ring */}
        <circle cx="100" cy="100" r="94" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        {/* Inner ring */}
        <circle cx="100" cy="100" r="70" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* Center glow ring */}
        <circle cx="100" cy="100" r="46" stroke="rgba(34,211,238,0.12)" strokeWidth="1" />

        {/* Axis lines */}
        <line x1="100" y1="6"   x2="100" y2="194" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="6"   y1="100" x2="194" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="28"  y1="28"  x2="172" y2="172" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="172" y1="28"  x2="28"  y2="172" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Accent dots on outer ring */}
        <circle cx="100" cy="6"   r="3" fill="rgba(34,211,238,0.5)" />
        <circle cx="194" cy="100" r="2.5" fill="rgba(34,211,238,0.35)" />
        <circle cx="100" cy="194" r="2.5" fill="rgba(34,211,238,0.25)" />
        <circle cx="6"   cy="100" r="2.5" fill="rgba(34,211,238,0.25)" />

        {/* Small dots at diagonals */}
        <circle cx="28"  cy="28"  r="2" fill="rgba(255,255,255,0.15)" />
        <circle cx="172" cy="28"  r="2" fill="rgba(255,255,255,0.15)" />
        <circle cx="172" cy="172" r="2" fill="rgba(255,255,255,0.15)" />
        <circle cx="28"  cy="172" r="2" fill="rgba(255,255,255,0.15)" />
      </svg>

      {/* Zodiac sign image */}
      <div className="relative z-10 w-[88px] h-[88px]">
        <Image
          src={`/zodiac/${sign}.png`}
          alt={sign}
          fill
          className="object-contain"
          style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.4))' }}
        />
      </div>
    </div>
  )
}

// ── Attribute tile ────────────────────────────────────────────────────────────

function AttributeTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center gap-1.5 py-4 px-2"
      style={{
        background: 'rgba(14,27,49,0.85)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div>{icon}</div>
      <span className="text-[10px] leading-none text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-text-primary leading-none">{value}</span>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBirthDateTime(date: string | null, time: string | null): string {
  if (!date) return 'Unknown'
  const d = new Date(date + 'T00:00:00')
  const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (!time) return datePart
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${datePart} · ${hour}:${m.toString().padStart(2, '0')} ${period}`
}

// ── Profile data type ────────────────────────────────────────────────────────

interface ProfileData {
  userId: string
  subjectId: string | null
  isPlaceholder: boolean
  sunSign: string | null
  displayName: string | null
  gender: string | null
  relationshipStatus: string | null
  birthDate: string | null
  birthTime: string | null
  birthPlaceName: string | null
  timezone: string
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfilePage() {
  const router = useRouter()

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () =>
      astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.view',
      }),
    staleTime: 60_000,
  })

  const sunSign = profile?.sunSign ?? null
  const attrs = sunSign ? ZODIAC_ATTRS[sunSign] : null
  const displayName = profile?.displayName ?? 'You'

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
        <h1 className="font-mystical text-2xl text-[#F4E2B4] flex-1 text-center mr-8">Profile</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="px-5 pt-6 pb-8 flex flex-col items-center gap-6">

          {/* Avatar + name + edit */}
          <div className="w-full flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar circle */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,211,238,0.12)', border: '2px solid rgba(34,211,238,0.25)' }}
              >
                <User size={26} className="text-cyan-300" />
              </div>
              <div>
                <p className="font-semibold text-base text-text-primary leading-tight">{displayName}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatBirthDateTime(profile?.birthDate ?? null, profile?.birthTime ?? null)}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/settings/profile/edit')}
              className="flex items-center gap-0.5 text-sm text-cyan-300 active:text-cyan-100"
            >
              Edit <ChevronRight size={14} />
            </button>
          </div>

          {/* Zodiac orbital wheel */}
          {sunSign ? (
            <div className="flex flex-col items-center gap-3">
              <ZodiacWheel sign={sunSign} />
              <p className="text-base text-text-secondary font-medium capitalize">
                Sun sign — {sunSign.charAt(0).toUpperCase() + sunSign.slice(1)}
              </p>
            </div>
          ) : (
            <div
              className="w-full rounded-2xl p-5 text-center"
              style={{ background: 'rgba(14,27,49,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-sm text-text-muted">Add your birth date to see your sun sign</p>
              <button
                onClick={() => router.push('/settings/profile/edit/birth-date')}
                className="mt-3 text-sm font-semibold text-cyan-300"
              >
                Add birth date →
              </button>
            </div>
          )}

          {/* Attribute grid */}
          {attrs && (
            <div className="w-full grid grid-cols-3 gap-3">
              <AttributeTile
                label="Moon Sign"
                value="—"
                icon={<MoonIcon />}
              />
              <AttributeTile
                label="Element"
                value={attrs.element}
                icon={<FlameIcon />}
              />
              <AttributeTile
                label="Ascendant"
                value="—"
                icon={<ArrowIcon />}
              />
              <AttributeTile
                label="Planet"
                value={attrs.planet}
                icon={<PlanetIcon />}
              />
              <AttributeTile
                label="Polarity"
                value={attrs.polarity}
                icon={<PolarityIcon polarity={attrs.polarity} />}
              />
              <AttributeTile
                label="Modality"
                value={attrs.modality}
                icon={<ModalityIcon modality={attrs.modality} />}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
