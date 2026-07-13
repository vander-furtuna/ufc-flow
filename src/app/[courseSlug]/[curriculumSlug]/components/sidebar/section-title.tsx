import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type SectionTitleProps = {
  children: ReactNode
  hasPadding?: boolean
  side?: 'center' | 'left' | 'right'
} & React.HTMLAttributes<HTMLDivElement>

export function Line() {
  return <div className="bg-foreground/10 h-0.5 w-full" />
}

export function SectionTitle({
  children,
  hasPadding = false,
  side = 'center',
  className,
  ...rest
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-0',
        hasPadding && 'px-4',
        className,
      )}
      {...rest}
    >
      {['right', 'center'].includes(side) && <Line />}
      <h2 className="text-md font-clash text-center font-semibold text-nowrap uppercase">
        {children}
      </h2>
      {['center', 'left'].includes(side) && <Line />}
    </div>
  )
}
