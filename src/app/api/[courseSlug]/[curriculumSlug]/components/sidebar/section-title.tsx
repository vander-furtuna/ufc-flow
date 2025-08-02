import type { ReactNode } from 'react'

export interface SectionTitleProps {
  children: ReactNode
}

export function Line() {
  return <div className="bg-foreground/10 h-0.5 w-full" />
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-4 px-2">
      <Line />
      <h2 className="text-md font-clash text-center font-semibold text-nowrap uppercase">
        {children}
      </h2>
      <Line />
    </div>
  )
}
