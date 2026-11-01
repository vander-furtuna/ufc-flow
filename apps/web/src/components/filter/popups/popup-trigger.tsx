import { Glow } from '@/components/glow'
import { DEFAULT_COLORS } from '@/constants/default-colors'
import { CaretDownIcon } from '@phosphor-icons/react'
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
        className="group/filter relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full border border-border bg-accent px-2.5 py-1.5"
      >
        <i className="z-10 text-muted-foreground group-data-[active=active]/filter:text-foreground">
          {icon}
        </i>
        {label && <span className="z-10 text-xs">{label}</span>}
        <CaretDownIcon
          weight="bold"
          className="z-10 size-3 text-muted-foreground transition-all group-data-[state=open]/filter:rotate-180"
        />

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
