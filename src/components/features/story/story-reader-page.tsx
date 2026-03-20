'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useStoryArticle } from '@/hooks/use-stories'

interface StoryReaderClientProps {
  slug: string
}

export function StoryReaderClient({ slug }: StoryReaderClientProps) {
  const router = useRouter()
  const { data: article, isLoading } = useStoryArticle(slug)

  if (isLoading) {
    return (
      <div className="px-4 py-8 flex items-center justify-center">
        <span className="text-sm text-text-secondary">Loading…</span>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm text-text-secondary">Story not found.</p>
      </div>
    )
  }

  const category = article.category

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
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">STORY</p>
          <h1 className="font-display text-base font-bold text-text-primary">{category.title}</h1>
        </div>
      </div>

      <article className="pb-20">
        <div className="relative h-80 overflow-hidden">
          <Image src={category.image} alt={category.title} fill className="object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(2,10,20,0.3) 0%, rgba(2,10,20,0.8) 60%, rgba(2,10,20,0.95) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-8 px-6 text-center">
            <h2 className="font-mystical text-4xl text-[#F8E7C3] leading-tight mb-2">{article.title}</h2>
            <p className="text-sm text-text-secondary">{article.subtitle}</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-3">
          {article.sections.map((section) => (
            <section
              key={section.heading}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(15,30,53,0.78)',
                border: `1px solid ${article.accent}30`,
              }}
            >
              <h3 className="font-display text-sm font-bold mb-2" style={{ color: article.accent }}>
                {section.heading}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">{section.body}</p>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="text-xs text-text-secondary flex items-start gap-2">
                      <span style={{ color: article.accent }}>•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>

      <div
        className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[390px] px-4 py-2.5"
        style={{
          background: 'linear-gradient(to top, rgba(6,13,27,0.95), rgba(6,13,27,0.75), rgba(6,13,27,0))',
        }}
      >
        <div className="rounded-2xl glass-card p-2.5 flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-text-secondary">
            <ThumbsUp size={14} />
            <span className="text-[10px] font-display">Like</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-secondary">
            <ThumbsDown size={14} />
            <span className="text-[10px] font-display">Dislike</span>
          </button>
        </div>
      </div>
    </div>
  )
}
