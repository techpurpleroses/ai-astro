'use client'

import { usePathname } from 'next/navigation'
import {
  Sun,
  MessageCircle,
  Sparkles,
  Heart,
  Telescope,
} from 'lucide-react'
import { BottomNavItem } from './bottom-nav-item'

const TABS = [
  { href: '/today',         icon: <Sun size={20} />,           label: 'Today'       },
  { href: '/advisors',      icon: <MessageCircle size={20} />, label: 'Advisors'    },
  { href: '/features',      icon: <Sparkles size={20} />,      label: 'Features'    },
  { href: '/compatibility', icon: <Heart size={20} />,         label: 'Compat.'     },
  { href: '/birth-chart',   icon: <Telescope size={20} />,     label: 'Birth Chart' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="
        shrink-0 z-50
        flex h-[68px] w-full
        border-t border-white/[0.06]
        bg-midnight-900/90 backdrop-blur-xl
        pb-safe
      "
      aria-label="Main navigation"
    >
      {TABS.map((tab) => (
        <BottomNavItem
          key={tab.href}
          href={tab.href}
          icon={tab.icon}
          label={tab.label}
          isActive={pathname.startsWith(tab.href)}
        />
      ))}
    </nav>
  )
}
