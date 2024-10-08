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
        className="flex items-center gap-0.5 bg-slate-200 px-2 py-1 rounded-md h-6 dark:bg-slate-700 data-[active=active]:bg-slate-400 data-[active=active]:text-slate-100 group text-slate-500 dark:data-[active=active]:text-slate-700"
      >
        {icon}
        <ChevronDown className="size-3 group-data-[state=open]:rotate-180 transition-all" />
      </button>
    )
  },
)

PopupTrigger.displayName = 'PopupTrigger'
