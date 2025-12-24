import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type SemesterTitleProps = {
  children: ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export function Line() {
  return <div className="bg-foreground/10 h-0.5 w-full" />
}

export function SemesterTitle({
  children,
  className,
  ...props
}: SemesterTitleProps) {
  return (
    <div className={cn('flex items-center gap-6', className)} {...props}>
      <Line />
      <strong className="font-clash text-foreground/90 text-xl text-nowrap">
        {children}
      </strong>
      <Line />
    </div>
  )
}
