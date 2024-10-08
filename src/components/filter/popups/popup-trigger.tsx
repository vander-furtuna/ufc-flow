import { ChevronDown } from 'lucide-react'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface PopupTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: JSX.Element
  isActive?: boolean
}

export const PopupTrigger = forwardRef<HTMLButtonElement, PopupTriggerProps>(
  ({ icon, isActive, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        {...rest}
        data-active={isActive ? 'active' : 'inactive'}
        className="group flex h-6 items-center gap-0.5 rounded-md bg-slate-200 px-2 py-1 text-slate-500 data-[active=active]:bg-slate-400 data-[active=active]:text-slate-100 dark:bg-slate-700 dark:data-[active=active]:text-slate-700"
      >
        {icon}
        <ChevronDown className="size-3 transition-all group-data-[state=open]:rotate-180" />
      </button>
    )
  },
)

PopupTrigger.displayName = 'PopupTrigger'
