'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { getQueryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        disableTransitionOnChange
      >
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(15, 30, 53, 0.95)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              color: '#F8FAFC',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
