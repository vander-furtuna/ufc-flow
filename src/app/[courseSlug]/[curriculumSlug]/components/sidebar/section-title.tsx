import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type SectionTitleProps = {
  children: ReactNode
  hasPadding?: boolean
}

export function Line() {
  return <div className="bg-foreground/10 h-0.5 w-full" />
}

export function SectionTitle({
  children,
  hasPadding = false,
}: SectionTitleProps) {
  return (
    <div className={cn('flex items-center gap-4 px-0', hasPadding && 'px-4')}>
      <Line />
      <h2 className="text-md font-clash text-center font-semibold text-nowrap uppercase">
        {children}
      </h2>
      <Line />
    </div>
  )
}
