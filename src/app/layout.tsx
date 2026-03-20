import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter, Cinzel } from 'next/font/google'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'
import { BRAND_FULL, BRAND_NAME } from '@/lib/brand'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: 'Personalized astrology readings, birth charts, tarot, and cosmic guidance powered by AI.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: BRAND_NAME,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A1628',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <body
        className={`
          ${spaceGrotesk.variable}
          ${inter.variable}
          ${cinzel.variable}
          antialiased
        `}
      >
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
