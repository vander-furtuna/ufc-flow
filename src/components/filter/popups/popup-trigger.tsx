import { Glow } from '@/components/glow'
import { DEFAULT_COLORS } from '@/constants/default-colors'
import { ChevronDown } from 'lucide-react'
import { type ButtonHTMLAttributes, forwardRef, type JSX } from 'react'

type PopupTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: JSX.Element
  label?: string
  isActive?: boolean
}

export const PopupTrigger = forwardRef<HTMLButtonElement, PopupTriggerProps>(
  ({ icon, isActive, label, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        {...rest}
        data-active={isActive ? 'active' : 'inactive'}
        className="bg-accent border-border group/filter relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1.5"
      >
        <i className="text-muted-foreground group-data-[active=active]/filter:text-foreground z-10">
          {icon}
        </i>
        {label && <span className="z-10 text-xs">{label}</span>}
        <ChevronDown className="text-muted-foreground z-10 size-3 transition-all group-data-[state=open]/filter:rotate-180" />

        <Glow
          colors={DEFAULT_COLORS.FORTRESS}
          data-state={isActive ? 'active' : 'inactive'}
          className="absolute -left-3 size-12 opacity-0 blur-sm transition-all data-[state=active]:opacity-90"
        />
      </button>
    )
  },
)

PopupTrigger.displayName = 'PopupTrigger'
