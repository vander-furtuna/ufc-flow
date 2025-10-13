import type { ReactNode } from 'react'

export type SemesterTitleProps = {
  children: ReactNode
}

export function Line() {
  return <div className="bg-foreground/10 h-0.5 w-full" />
}

export function SemesterTitle({ children }: SemesterTitleProps) {
  return (
    <div className="flex items-center gap-6">
      <Line />
      <strong className="font-clash text-foreground/90 text-xl text-nowrap">
        {children}
      </strong>
      <Line />
    </div>
  )
}
