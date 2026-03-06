'use client'

import { cn } from '@/lib/utils'
import {
  TODAY_SECTION_CONTENT_GAP_CLASS,
  TODAY_SECTION_TITLE_CLASS,
} from './layout-tokens'

interface TabSectionBlockProps {
  title: string
  className?: string
  titleClassName?: string
  contentClassName?: string
  children: React.ReactNode
}

export function TabSectionBlock({
  title,
  className,
  titleClassName,
  contentClassName,
  children,
}: TabSectionBlockProps) {
  return (
    <section className={className}>
      <p className={cn(TODAY_SECTION_TITLE_CLASS, titleClassName)}>{title}</p>
      <div className={cn(TODAY_SECTION_CONTENT_GAP_CLASS, contentClassName)}>{children}</div>
    </section>
  )
}
