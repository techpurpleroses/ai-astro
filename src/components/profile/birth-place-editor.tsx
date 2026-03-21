'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, MapPin } from 'lucide-react'
import { astroFetchJson } from '@/lib/client/astro-fetch'

interface ProfileData {
  birthPlaceName: string | null
}

interface LocationSuggestion {
  name: string
  displayName: string
  lat: number
  lon: number
}

interface AutocompleteResponse {
  suggestions: LocationSuggestion[]
}

export function BirthPlaceEditor() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () =>
      astroFetchJson('/api/dashboard/profile', { debugOrigin: 'components.profile.birth-place' }),
    staleTime: 60_000,
  })

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-fill
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    if (!prefilled && profile?.birthPlaceName) {
      setQuery(profile.birthPlaceName)
      setPrefilled(true)
    }
  }, [profile, prefilled])

  function handleInput(value: string) {
    setQuery(value)
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) return

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await astroFetchJson<AutocompleteResponse>(
          `/api/location/autocomplete?q=${encodeURIComponent(value)}&limit=6`,
          { debugOrigin: 'components.profile.birth-place.autocomplete' }
        )
        setSuggestions(data.suggestions ?? [])
      } catch {
        // Non-fatal
      }
    }, 350)
  }

  async function handleSelect(suggestion: LocationSuggestion) {
    setQuery(suggestion.displayName)
    setSuggestions([])
    setSaving(true)
    setError(null)
    try {
      await astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.birth-place.save',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthPlaceName: suggestion.displayName }),
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveManual() {
    if (saving || query.trim().length < 2) return
    setSaving(true)
    setError(null)
    try {
      await astroFetchJson('/api/dashboard/profile', {
        debugOrigin: 'components.profile.birth-place.save-manual',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthPlaceName: query.trim() }),
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
        <h1 className="font-mystical text-2xl text-[#F4E2B4] flex-1 text-center mr-8">Place of Birth</h1>
      </div>

      <div className="flex flex-col items-center px-5 pt-8 gap-6">
        {/* Location icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.15), rgba(14,27,49,0.8))' }}
        >
          <MapPin size={44} className="text-amber-400" />
        </div>

        <p className="text-sm text-text-muted text-center">
          Your place of birth is required to calculate the house number that each of your planets is in.
        </p>

        <div className="w-full relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Birth Place"
            className="w-full rounded-xl px-4 py-3.5 text-base text-text-primary outline-none focus:ring-1 focus:ring-cyan-400"
            style={{
              background: 'rgba(14,27,49,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />

          {suggestions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 z-20 rounded-xl mt-1 overflow-hidden"
              style={{ background: 'rgba(10,22,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { void handleSelect(s) }}
                  className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-white/6 active:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-400 self-start">{error}</p>
        )}
      </div>

      <div className="mt-auto px-5 pb-10 pt-6">
        <button
          onClick={() => { void handleSaveManual() }}
          disabled={saving || query.trim().length < 2}
          className="w-full py-3.5 rounded-full text-base font-semibold text-[#061327] disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #22d3ee, #2dd4bf)' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
