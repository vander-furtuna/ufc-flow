import type { HTMLAttributes, JSX } from 'react'

import { Glow } from '@/components/glow'
import { capitalizeWords } from '@/utils/capitalize-words'

type PillProps = HTMLAttributes<HTMLButtonElement> & {
  Icon: JSX.Element
  label: string
  colors?: string | string[]
  isActive?: boolean
}

export function Pill({ Icon, label, colors, isActive, ...rest }: PillProps) {
  const capitalezedLabel = capitalizeWords(label)

  return (
    <button
      title={capitalezedLabel}
      className="center relative flex w-fit max-w-72 gap-1 overflow-hidden rounded-full bg-slate-50/40 px-2 py-1 text-slate-800 transition-all duration-300 dark:bg-slate-900/30 dark:text-slate-100 dark:hover:bg-slate-900/40"
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
      <span className="font-clash z-10 line-clamp-1 text-left text-sm font-[550]">
        {capitalezedLabel}
      </span>
    </button>
  )
}
