import type { ReactNode } from 'react'

export interface SectionTitleProps {
  children: ReactNode
}

export function Line() {
  return <div className="h-0.5 w-full bg-foreground/10" />
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-4 px-2">
      <Line />
      <h2 className="text-md text-nowrap text-center font-clash font-semibold uppercase">
        {children}
      </h2>
      <Line />
    </div>
  )
}
