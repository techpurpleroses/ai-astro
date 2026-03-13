'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch {
        // Service worker is optional for browsing; install flow falls back gracefully.
      }
    }

    void register()
  }, [])

  return null
}
