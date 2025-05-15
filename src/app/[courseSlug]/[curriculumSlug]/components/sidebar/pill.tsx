import type { HTMLAttributes } from 'react'

import { Glow } from '@/components/glow'

interface PillProps extends HTMLAttributes<HTMLButtonElement> {
  Icon: JSX.Element
  label: string
  colors?: string | string[]
  isActive?: boolean
}

export function Pill({ Icon, label, colors, isActive, ...rest }: PillProps) {
  return (
    <button
      className="relative flex w-fit gap-1 overflow-hidden rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 center dark:bg-slate-900/30 dark:text-slate-100 dark:hover:bg-slate-900/40"
      {...rest}
    >
      {colors && (
        <Glow
          colors={colors}
          className="absolute left-0 z-10 size-12 opacity-0 blur-lg transition-all duration-300 data-[active=active]:opacity-100"
          data-active={isActive ? 'active' : 'inactive'}
        />
      )}
      <figure className="z-10">{Icon}</figure>
      <span className="z-10 font-clash text-sm">{label}</span>
    </button>
  )
}
