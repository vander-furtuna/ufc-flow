import type { HTMLAttributes } from 'react'

interface PillProps extends HTMLAttributes<HTMLButtonElement> {
  Icon: JSX.Element
  label: string
}

export function Pill({ Icon, label, ...rest }: PillProps) {
  return (
    <button
      className="flex w-fit gap-1 rounded-full bg-slate-50/40 px-2 py-1 font-semibold text-slate-800 transition-all duration-300 center dark:bg-slate-900/30 dark:text-slate-100 dark:hover:bg-slate-900/40"
      {...rest}
    >
      {Icon}
      <span className="font-space text-sm">{label}</span>
    </button>
  )
}
