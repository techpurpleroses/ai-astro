'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { STORY_CATEGORIES } from '@/data/stories'

export function StoryHubClient() {
  const router = useRouter()

  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(10,22,40,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">FEATURES</p>
          <h1 className="font-display text-base font-bold text-text-primary">Story</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {STORY_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => router.push(`/features/story/${category.id}`)}
            className="w-full rounded-2xl overflow-hidden text-left glass-card active:bg-white/5 transition-colors"
            style={{ borderColor: `${category.accent}40` }}
          >
            <div className="flex items-center gap-3 p-3.5">
              <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-midnight-700/60">
                <Image src={category.image} alt={category.title} width={48} height={48} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-text-primary">{category.title}</p>
                <p className="text-xs text-text-secondary truncate">{category.subtitle}</p>
              </div>
              <ChevronRight size={16} className="text-text-secondary" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
