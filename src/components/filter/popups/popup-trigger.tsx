import { type ButtonHTMLAttributes, forwardRef, type JSX } from 'react'

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
        className="group flex h-6 items-center gap-0.5 rounded-md bg-slate-200 px-2 py-1 text-muted-foreground transition-all data-[active=active]:bg-slate-400 data-[state=open]:bg-slate-300 data-[state=open]:px-2.5 data-[active=active]:text-slate-100 data-[state=open]:text-muted-foreground dark:bg-slate-700 dark:data-[state=open]:bg-slate-600 dark:data-[active=active]:text-slate-700 dark:data-[state=open]:text-slate-200"
      >
        {icon}
      </button>
    )
  },
)

PopupTrigger.displayName = 'PopupTrigger'
