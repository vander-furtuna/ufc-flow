import type { ReactNode } from 'react'

export interface SemesterTitleProps {
  children: ReactNode
}

export function Line() {
  return <div className="w-full h-0.5 bg-foreground/10" />
}

export function SemesterTitle({ children }: SemesterTitleProps) {
  return (
    <div className="flex items-center gap-6">
      <Line />
      <strong className="text-nowrap font-space text-xl text-foreground/90">
        {children}
      </strong>
      <Line />
    </div>
  )
}
